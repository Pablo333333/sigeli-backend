import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UseInterceptors,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePostulacionDto } from './dto/create-postulacion.dto';
import { UpdatePostulacionStatusDto } from './dto/update-postulacion-status.dto';
import { ApplicationStatus, Prisma, Role } from '@prisma/client';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import {
  ADVANCE_SUBSTATUSES,
  REJECT_SUBSTATUSES,
  STAGE_LABELS,
  STAGE_SUBSTATUSES,
  TimelineEvent,
  buildVisualTimeline,
  createTimelineEvent,
  getNextStage,
  PIPELINE_ORDER,
} from './timeline.constants';

@Injectable()
@UseInterceptors(AuditInterceptor)
export class PostulacionService {
  constructor(private readonly prisma: PrismaService) {}

  private parseTimeline(raw: unknown): TimelineEvent[] {
    if (!Array.isArray(raw)) return [];
    return raw as TimelineEvent[];
  }

  private enrichPostulacion(p: any) {
    const timeline = this.parseTimeline(p.timeline);
    return {
      ...p,
      timeline,
      visualTimeline: buildVisualTimeline(p.status, timeline),
      stageLabel: STAGE_LABELS[p.status as ApplicationStatus] || p.status,
    };
  }

  /**
   * Inicia postulación. Directiva/Empresa/Admin pueden indicar userId del comunero.
   */
  async createPostulacion(
    dto: CreatePostulacionDto,
    actor?: { userId: string; role: string; fullName?: string },
  ) {
    const userId = dto.userId;
    const { ofertaId } = dto;

    if (!userId) {
      throw new BadRequestException('Debe indicar el comunero (userId) a postular.');
    }

    try {
      const [user, oferta, actorUser] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          include: { cv: { include: { habilidades: true } } },
        }),
        this.prisma.oferta.findUnique({ where: { id: ofertaId } }),
        actor?.userId
          ? this.prisma.user.findUnique({
              where: { id: actor.userId },
              select: { id: true, fullName: true, role: true },
            })
          : Promise.resolve(null),
      ]);

      if (!user || user.deletedAt) {
        throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
      }
      if (user.role !== Role.COMUNERO) {
        throw new BadRequestException('Solo se puede postular a usuarios con rol COMUNERO.');
      }
      if (!oferta || oferta.deletedAt) {
        throw new NotFoundException(`Oferta con ID ${ofertaId} no encontrada`);
      }
      if (oferta.status !== 'VIGENTE') {
        throw new BadRequestException('La oferta no está vigente.');
      }

      const existing = await this.prisma.postulacion.findFirst({
        where: {
          userId,
          ofertaId,
          deletedAt: null,
          status: { not: ApplicationStatus.RECHAZADO },
        },
      });
      if (existing) {
        throw new ConflictException('Este comunero ya tiene una postulación activa a esta oferta.');
      }

      const submittedBy = actorUser || (actor ? { id: actor.userId, fullName: actor.fullName, role: actor.role } : null);
      const byDirectiva = submittedBy?.role === Role.DIRECTIVA;
      const matchingScore = this.calculateMatchingScore(user, oferta);

      const initialEvent = createTimelineEvent({
        stage: ApplicationStatus.PRESENTACION_CV,
        subStatus: 'ENVIADO',
        notes:
          dto.notes ||
          (byDirectiva
            ? `CV presentado por Directiva Comunal (${submittedBy?.fullName || 'Directiva'})`
            : submittedBy?.role === Role.COMUNERO
              ? 'CV presentado por el propio comunero'
              : `CV presentado por ${submittedBy?.fullName || 'el sistema'}`),
        actorId: submittedBy?.id,
        actorRole: submittedBy?.role,
        actorName: submittedBy?.fullName,
        deadline: this.defaultDeadlineDays(5),
      });

      const created = await this.prisma.postulacion.create({
        data: {
          userId,
          ofertaId,
          submittedById: submittedBy?.id,
          status: ApplicationStatus.PRESENTACION_CV,
          timeline: [initialEvent] as unknown as Prisma.JsonArray,
          aiMatchingScore: matchingScore,
        },
        include: {
          user: { select: { id: true, fullName: true, dni: true } },
          oferta: { select: { id: true, title: true, sector: true, companyName: true } },
          submittedBy: { select: { id: true, fullName: true, role: true } },
        },
      });

      return this.enrichPostulacion(created);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(`Error al crear postulación: ${error.message}`);
    }
  }

  private defaultDeadlineDays(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }

  private calculateMatchingScore(user: any, oferta: any): number {
    const requirements = (oferta.requirements as any) || {};
    const userSkills = user.cv?.habilidades?.map((h: any) => h.name.toLowerCase()) || [];

    if (Object.keys(requirements).length === 0 && !oferta.perfilRequisitos) return 70;

    let matches = 0;
    let totalCriteria = 0;

    const titleKeywords = String(oferta.title || '')
      .toLowerCase()
      .split(/\s+/);
    titleKeywords.forEach((word: string) => {
      if (word.length > 3) {
        totalCriteria++;
        if (userSkills.some((s: string) => s.includes(word))) matches++;
      }
    });

    const score =
      totalCriteria > 0 ? 60 + (matches / totalCriteria) * 35 : 75 + Math.floor(Math.random() * 15);

    return Math.min(Math.round(score), 99);
  }

  /**
   * Avanza o actualiza etapa con validación de transiciones y subestados.
   */
  async updateStatus(
    id: string,
    dto: UpdatePostulacionStatusDto,
    actor?: { userId: string; role: string; fullName?: string },
  ) {
    try {
      const postulacion = await this.prisma.postulacion.findUnique({
        where: { id },
        include: { oferta: true, user: true },
      });

      if (!postulacion || postulacion.deletedAt) {
        throw new NotFoundException(`Postulación con ID ${id} no encontrada`);
      }

      if (postulacion.status === ApplicationStatus.RECHAZADO) {
        throw new BadRequestException('La postulación ya está rechazada y no admite avances.');
      }
      if (postulacion.status === ApplicationStatus.CONTRATADO) {
        throw new BadRequestException('La postulación ya está contratada (subida al trabajo).');
      }

      const { newStatus, subStatus, notes, deadline, meta } = dto;
      this.validateTransition(postulacion.status, newStatus, subStatus);

      const currentTimeline = this.parseTimeline(postulacion.timeline);
      const event = createTimelineEvent({
        stage: newStatus,
        subStatus,
        notes: notes || `Avance a ${STAGE_LABELS[newStatus]}${subStatus ? ` (${subStatus})` : ''}`,
        deadline: deadline || this.defaultDeadlineDays(5),
        actorId: actor?.userId,
        actorRole: actor?.role,
        actorName: actor?.fullName,
        meta: meta as TimelineEvent['meta'],
      });

      const updatedTimeline = [...currentTimeline, event];

      // Si el subestado es de rechazo, forzar RECHAZADO
      let finalStatus = newStatus;
      if (subStatus && REJECT_SUBSTATUSES.includes(subStatus)) {
        finalStatus = ApplicationStatus.RECHAZADO;
        if (newStatus !== ApplicationStatus.RECHAZADO) {
          updatedTimeline.push(
            createTimelineEvent({
              stage: ApplicationStatus.RECHAZADO,
              subStatus: 'CERRADO',
              notes: notes || `Rechazado en etapa ${STAGE_LABELS[newStatus]}`,
              actorId: actor?.userId,
              actorRole: actor?.role,
              actorName: actor?.fullName,
            }),
          );
        }
      }

      const updated = await this.prisma.postulacion.update({
        where: { id },
        data: {
          status: finalStatus,
          timeline: updatedTimeline as unknown as Prisma.JsonArray,
        },
        include: {
          user: { select: { id: true, fullName: true, dni: true } },
          oferta: { select: { id: true, title: true, sector: true } },
          submittedBy: { select: { id: true, fullName: true, role: true } },
        },
      });

      if (finalStatus === ApplicationStatus.CONTRATADO) {
        await this.autoContratar(id, postulacion);
      }

      return this.enrichPostulacion(updated);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(`Error al actualizar estado: ${error.message}`);
    }
  }

  private validateTransition(
    current: ApplicationStatus,
    next: ApplicationStatus,
    subStatus?: string,
  ) {
    if (next === ApplicationStatus.RECHAZADO) {
      return; // rechazo permitido desde cualquier etapa no terminal
    }

    const allowedSubs = STAGE_SUBSTATUSES[next];
    if (allowedSubs && subStatus && !allowedSubs.includes(subStatus)) {
      throw new BadRequestException(
        `Subestado "${subStatus}" no válido para ${STAGE_LABELS[next]}. Permitidos: ${allowedSubs.join(', ')}`,
      );
    }

    // Misma etapa: actualización de subestado (ej. OBSERVADO → REAPROBADO)
    if (next === current) {
      if (!subStatus) {
        throw new BadRequestException('Debe indicar subStatus al actualizar la misma etapa.');
      }
      return;
    }

    const expectedNext = getNextStage(current);
    if (next !== expectedNext) {
      throw new BadRequestException(
        `Transición inválida: de ${STAGE_LABELS[current]} solo puede avanzar a ${
          expectedNext ? STAGE_LABELS[expectedNext] : 'ninguna (fin de pipeline)'
        } o RECHAZADO. Recibido: ${STAGE_LABELS[next]}.`,
      );
    }

    // Al avanzar, el subestado debe ser uno que permita avance (si se envía)
    const advanceOk = ADVANCE_SUBSTATUSES[current];
    if (advanceOk && current !== ApplicationStatus.PRESENTACION_CV) {
      // El avance se valida respecto al resultado de la etapa que se está cerrando;
      // el subStatus del DTO corresponde a la NUEVA etapa. No bloqueamos aquí.
    }

    if (allowedSubs && !subStatus) {
      const stagesRequiringSub: ApplicationStatus[] = [
        ApplicationStatus.SEGURIDAD,
        ApplicationStatus.ENTREVISTA,
        ApplicationStatus.MEDICO,
        ApplicationStatus.INDUCCION,
      ];
      if (stagesRequiringSub.includes(next)) {
        throw new BadRequestException(
          `La etapa ${STAGE_LABELS[next]} requiere subStatus: ${allowedSubs.join(', ')}`,
        );
      }
    }
  }

  private async autoContratar(id: string, postulacion: any) {
    const existing = await this.prisma.contrato.findUnique({ where: { postulacionId: id } });
    if (existing) return;

    const oferta = postulacion.oferta;
    const months = oferta?.tiempoContratoMeses || 12;
    const startDate = oferta?.fechaInicioProyectada
      ? new Date(oferta.fechaInicioProyectada)
      : new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);

    await this.prisma.contrato.create({
      data: {
        postulacionId: id,
        userId: postulacion.userId,
        startDate,
        endDate,
        salary: oferta.salary,
        regimenLaboral: oferta.regimenLaboral || 'Régimen General',
        status: 'ACTIVO',
        stabilityIndex: 90,
        companyName: oferta.companyName || null,
        puesto: oferta.title || null,
        cargo: oferta.title || null,
        sector: oferta.sector || null,
        tipoManoObra: oferta.tipoManoObra || null,
        tiempoContratoMeses: months,
        horarioTrabajo: oferta.horarioTrabajo || null,
        sistemaTrabajo: oferta.sistemaTrabajo || null,
        observaciones: oferta.notaAviso || null,
      },
    });

    const newVacancies = Math.max(0, oferta.vacancies - 1);
    await this.prisma.oferta.update({
      where: { id: postulacion.ofertaId },
      data: {
        vacancies: newVacancies,
        status: newVacancies === 0 ? 'CULMINADO' : oferta.status,
      },
    });
  }

  async findByUserId(userId: string) {
    const rows = await this.prisma.postulacion.findMany({
      where: { userId, deletedAt: null },
      include: {
        oferta: {
          select: {
            id: true,
            title: true,
            sector: true,
            companyName: true,
            tipoManoObra: true,
          },
        },
        submittedBy: { select: { id: true, fullName: true, role: true } },
        contrato: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((p) => this.enrichPostulacion(p));
  }

  async findOne(id: string) {
    const postulacion = await this.prisma.postulacion.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, dni: true, role: true } },
        oferta: true,
        submittedBy: { select: { id: true, fullName: true, role: true } },
        contrato: true,
      },
    });

    if (!postulacion || postulacion.deletedAt) {
      throw new NotFoundException(`Postulación con ID ${id} no encontrada`);
    }
    return this.enrichPostulacion(postulacion);
  }

  async findAll(ofertaId?: string) {
    const rows = await this.prisma.postulacion.findMany({
      where: {
        deletedAt: null,
        ...(ofertaId ? { ofertaId } : {}),
      },
      include: {
        user: { select: { id: true, fullName: true, dni: true } },
        oferta: {
          select: {
            id: true,
            title: true,
            sector: true,
            vacancies: true,
            salary: true,
            companyName: true,
          },
        },
        submittedBy: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((p) => this.enrichPostulacion(p));
  }

  /**
   * Reporte de postulantes por oferta (Directiva / Empresa / Admin).
   */
  async getReportePostulantes(ofertaId?: string) {
    const ofertas = await this.prisma.oferta.findMany({
      where: {
        deletedAt: null,
        ...(ofertaId ? { id: ofertaId } : {}),
      },
      select: {
        id: true,
        title: true,
        companyName: true,
        sector: true,
        vacancies: true,
        status: true,
        postulaciones: {
          where: { deletedAt: null },
          include: {
            user: { select: { id: true, fullName: true, dni: true } },
            submittedBy: { select: { fullName: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ofertas.map((o) => ({
      ofertaId: o.id,
      puesto: o.title,
      empresa: o.companyName,
      sector: o.sector,
      vacantes: o.vacancies,
      estadoOferta: o.status,
      totalPostulantes: o.postulaciones.length,
      contratados: o.postulaciones.filter((p) => p.status === ApplicationStatus.CONTRATADO).length,
      rechazados: o.postulaciones.filter((p) => p.status === ApplicationStatus.RECHAZADO).length,
      enProceso: o.postulaciones.filter(
        (p) =>
          p.status !== ApplicationStatus.CONTRATADO && p.status !== ApplicationStatus.RECHAZADO,
      ).length,
      postulantes: o.postulaciones.map((p) => ({
        postulacionId: p.id,
        nombre: p.user.fullName,
        dni: p.user.dni,
        puesto: o.title,
        estado: p.status,
        estadoLabel: STAGE_LABELS[p.status],
        matching: p.aiMatchingScore != null ? Number(p.aiMatchingScore) : null,
        enviadoPor: p.submittedBy
          ? `${p.submittedBy.fullName} (${p.submittedBy.role})`
          : 'N/A',
        fecha: p.createdAt,
      })),
    }));
  }

  async getComuneros() {
    return this.prisma.user.findMany({
      where: { role: 'COMUNERO', deletedAt: null },
      select: { id: true, fullName: true, dni: true },
      orderBy: { fullName: 'asc' },
    });
  }

  getCatalogoEtapas() {
    return {
      pipeline: PIPELINE_ORDER.map((s) => ({
        status: s,
        label: STAGE_LABELS[s],
        subStatuses: STAGE_SUBSTATUSES[s] || [],
      })),
      labels: STAGE_LABELS,
    };
  }
}
