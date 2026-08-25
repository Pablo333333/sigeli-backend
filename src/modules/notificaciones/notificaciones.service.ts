import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TipoNotificacion } from './dto/notificacion.dto';
import { ContratoService } from '../contrato/contrato.service';
import { ApplicationStatus } from '@prisma/client';
import { STAGE_LABELS, TimelineEvent } from '../postulacion/timeline.constants';

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contratoService: ContratoService,
  ) {}

  async enviarAlertaOferta(oferta: any, destinatarios: { id: string }[]) {
    if (!destinatarios?.length) {
      this.logger.warn(`Sin destinatarios para alerta de oferta: ${oferta.title}`);
      return { enviadas: 0 };
    }

    const empresa = oferta.companyName || oferta.tenant?.name || 'Empresa convocante';
    const mensaje = `Nueva oferta laboral: "${oferta.title}" — ${empresa}. Sector: ${oferta.sector || 'N/D'}. Vacantes: ${oferta.vacancies ?? 1}. ¡Revisa Ofertas y postula!`;

    this.logger.log(
      `Broadcast oferta "${oferta.title}" → ${destinatarios.length} destinatario(s)`,
    );

    // createMany en lotes (evita saturar DB)
    const chunk = 80;
    let enviadas = 0;
    for (let i = 0; i < destinatarios.length; i += chunk) {
      const slice = destinatarios.slice(i, i + chunk);
      const result = await this.prisma.notificacion.createMany({
        data: slice.map((u) => ({
          usuarioId: u.id,
          mensaje,
          tipo: TipoNotificacion.OFERTA,
          estado: 'ENVIADO',
          leido: false,
        })),
      });
      enviadas += result.count;
    }

    this.logger.log(`[SIMULACIÓN SMS/PUSH] ${enviadas} alertas de oferta enviadas`);
    return { enviadas };
  }

  async enviarAlertaVencimiento(contrato: any) {
    this.logger.log(
      `Enviando alerta de vencimiento para el contrato de: ${contrato.user.fullName}`,
    );

    await this.registrarNotificacion({
      usuarioId: contrato.userId,
      mensaje: `Tu contrato está próximo a vencer el ${new Date(contrato.endDate).toLocaleDateString()}. Por favor, contacta con recursos humanos.`,
      tipo: TipoNotificacion.VENCIMIENTO,
    });
  }

  /** Expuesto para ChatService y otros módulos */
  async registrarNotificacionPublic(data: {
    usuarioId: string;
    mensaje: string;
    tipo: TipoNotificacion;
  }) {
    return this.registrarNotificacion(data);
  }

  private async registrarNotificacion(data: {
    usuarioId: string;
    mensaje: string;
    tipo: TipoNotificacion;
  }) {
    try {
      const notificacion = await this.prisma.notificacion.create({
        data: {
          usuarioId: data.usuarioId,
          mensaje: data.mensaje,
          tipo: data.tipo,
          estado: 'ENVIADO',
        },
      });

      this.logger.log(`[SIMULACIÓN SMS/VOZ] Para: ${data.usuarioId} - Mensaje: ${data.mensaje}`);
      return notificacion;
    } catch (error) {
      this.logger.error(`Error al registrar notificación: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCronVencimientos() {
    this.logger.log('Ejecutando CronJob de verificación de vencimientos...');

    const contratosProximos = await this.contratoService.getContratosProximosAVencer(5);

    for (const contrato of contratosProximos) {
      await this.enviarAlertaVencimiento(contrato);
    }

    this.logger.log(`CronJob vencimientos finalizado. ${contratosProximos.length} alertas.`);
  }

  /**
   * Alertas 5 días antes de cada fecha límite de etapa del timeline de postulación.
   * También se puede disparar manualmente vía endpoint.
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleCronDeadlinesPostulacion() {
    this.logger.log('Ejecutando CronJob de deadlines de postulación (5 días)...');
    const result = await this.procesarAlertasDeadline(5);
    this.logger.log(
      `CronJob deadlines finalizado. Revisadas=${result.revisadas}, Enviadas=${result.enviadas}`,
    );
  }

  async procesarAlertasDeadline(diasAntes = 5) {
    const ahora = new Date();
    const limiteInferior = new Date(ahora);
    limiteInferior.setHours(0, 0, 0, 0);
    const limiteSuperior = new Date(ahora);
    limiteSuperior.setDate(limiteSuperior.getDate() + diasAntes);
    limiteSuperior.setHours(23, 59, 59, 999);

    const postulaciones = await this.prisma.postulacion.findMany({
      where: {
        deletedAt: null,
        status: {
          notIn: [ApplicationStatus.CONTRATADO, ApplicationStatus.RECHAZADO],
        },
      },
      include: {
        user: { select: { id: true, fullName: true } },
        submittedBy: { select: { id: true } },
        oferta: { select: { title: true } },
      },
    });

    let enviadas = 0;
    let revisadas = 0;

    for (const p of postulaciones) {
      const events = Array.isArray(p.timeline) ? (p.timeline as unknown as TimelineEvent[]) : [];
      for (const event of events) {
        if (!event?.deadline || !event?.id) continue;
        revisadas++;
        const deadline = new Date(event.deadline);
        if (Number.isNaN(deadline.getTime())) continue;

        // ¿Está dentro de la ventana de alerta (hoy .. +diasAntes]?
        if (deadline < limiteInferior || deadline > limiteSuperior) continue;

        const already = await this.prisma.alertaDeadline.findUnique({
          where: {
            postulacionId_eventId: {
              postulacionId: p.id,
              eventId: event.id,
            },
          },
        });
        if (already) continue;

        const stageLabel =
          STAGE_LABELS[event.stage as ApplicationStatus] || event.stage || 'etapa';
        const mensaje = `Recordatorio: la etapa "${stageLabel}" de la postulación a "${p.oferta.title}" vence el ${deadline.toLocaleDateString()}. Quedan ~${Math.max(0, Math.ceil((deadline.getTime() - ahora.getTime()) / 86400000))} día(s).`;

        const destinatarios = new Set<string>();
        destinatarios.add(p.userId);
        if (p.submittedById) destinatarios.add(p.submittedById);

        for (const usuarioId of destinatarios) {
          await this.registrarNotificacion({
            usuarioId,
            mensaje,
            tipo: TipoNotificacion.PROCESO,
          });
        }

        await this.prisma.alertaDeadline.create({
          data: {
            postulacionId: p.id,
            eventId: event.id,
            deadlineDate: deadline,
            mensaje,
          },
        });
        enviadas++;
      }
    }

    return { revisadas, enviadas, diasAntes };
  }

  async getNotificacionesUsuario(usuarioId: string) {
    return this.prisma.notificacion.findMany({
      where: { usuarioId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async marcarComoLeida(id: string) {
    return this.prisma.notificacion.update({
      where: { id },
      data: { leido: true },
    });
  }
}
