import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TipoNotificacion } from './dto/notificacion.dto';
import { ContratoService } from '../contrato/contrato.service';

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contratoService: ContratoService,
  ) {}

  /**
   * Envía una notificación masiva de nueva oferta a un grupo de comuneros.
   */
  async enviarAlertaOferta(oferta: any, comuneros: any[]) {
    this.logger.log(`Enviando alertas para la oferta: ${oferta.title}`);
    
    const promesas = comuneros.map(comunero => 
      this.registrarNotificacion({
        usuarioId: comunero.id,
        mensaje: `Nueva oportunidad laboral: ${oferta.title} en el sector ${oferta.sector}. ¡Postula ahora!`,
        tipo: TipoNotificacion.OFERTA,
      })
    );

    await Promise.all(promesas);
  }

  /**
   * Envía una notificación de vencimiento de contrato.
   */
  async enviarAlertaVencimiento(contrato: any) {
    this.logger.log(`Enviando alerta de vencimiento para el contrato de: ${contrato.user.fullName}`);
    
    await this.registrarNotificacion({
      usuarioId: contrato.userId,
      mensaje: `Tu contrato está próximo a vencer el ${new Date(contrato.endDate).toLocaleDateString()}. Por favor, contacta con recursos humanos.`,
      tipo: TipoNotificacion.VENCIMIENTO,
    });
  }

  /**
   * Registra la notificación en la base de datos y simula el envío (SMS/Voz).
   */
  private async registrarNotificacion(data: { usuarioId: string, mensaje: string, tipo: TipoNotificacion }) {
    try {
      const notificacion = await this.prisma.notificacion.create({
        data: {
          usuarioId: data.usuarioId,
          mensaje: data.mensaje,
          tipo: data.tipo,
          estado: 'ENVIADO', // Simulación de envío exitoso
        },
      });

      this.logger.log(`[SIMULACIÓN SMS/VOZ] Para: ${data.usuarioId} - Mensaje: ${data.mensaje}`);
      return notificacion;
    } catch (error) {
      this.logger.error(`Error al registrar notificación: ${error.message}`);
    }
  }

  /**
   * CronJob diario para verificar contratos que vencen en menos de 5 días.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCronVencimientos() {
    this.logger.log('Ejecutando CronJob de verificación de vencimientos...');
    
    const contratosProximos = await this.contratoService.getContratosProximosAVencer(5);
    
    for (const contrato of contratosProximos) {
      await this.enviarAlertaVencimiento(contrato);
    }

    this.logger.log(`CronJob finalizado. ${contratosProximos.length} alertas procesadas.`);
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
