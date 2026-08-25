import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ComunicacionEstado, Role } from '@prisma/client';
import { SendComunicacionDto } from './dto/comunicacion.dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { TipoNotificacion } from '../notificaciones/dto/notificacion.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  private async getPostulacionOrThrow(postulacionId: string) {
    const p = await this.prisma.postulacion.findFirst({
      where: { id: postulacionId, deletedAt: null },
      include: {
        user: { select: { id: true, fullName: true, role: true } },
        submittedBy: { select: { id: true, fullName: true, role: true } },
        oferta: { select: { id: true, title: true, companyName: true } },
      },
    });
    if (!p) throw new NotFoundException('Postulación no encontrada');
    return p;
  }

  private assertAccess(postulacion: any, actor: { userId: string; role: string }) {
    const isCandidato = postulacion.userId === actor.userId;
    const isSubmitter = postulacion.submittedById === actor.userId;
    const staffRoles: Role[] = [Role.DIRECTIVA, Role.EMPRESA, Role.ADMIN];
    const isStaff = staffRoles.includes(actor.role as Role);
    if (!isCandidato && !isSubmitter && !isStaff) {
      throw new ForbiddenException('No tiene acceso a las comunicaciones de esta postulación.');
    }
  }

  private resolveDestinatario(postulacion: any, remitenteId: string, explicit?: string) {
    if (explicit) return explicit;
    if (remitenteId === postulacion.userId) {
      return postulacion.submittedById || null;
    }
    return postulacion.userId;
  }

  async listConversaciones(actor: { userId: string; role: string }) {
    const where =
      actor.role === Role.COMUNERO
        ? { userId: actor.userId, deletedAt: null }
        : { deletedAt: null };

    const rows = await this.prisma.postulacion.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, dni: true } },
        oferta: { select: { id: true, title: true, companyName: true } },
        submittedBy: { select: { id: true, fullName: true, role: true } },
        comunicaciones: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            remitente: { select: { fullName: true } },
          },
        },
        _count: {
          select: {
            comunicaciones: {
              where: {
                destinatarioId: actor.userId,
                estado: ComunicacionEstado.PENDIENTE,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    return rows.map((p) => ({
      postulacionId: p.id,
      puesto: p.oferta.title,
      empresa: p.oferta.companyName,
      candidato: p.user.fullName,
      candidatoDni: p.user.dni,
      estadoProceso: p.status,
      ultimoMensaje: p.comunicaciones[0]
        ? {
            texto: p.comunicaciones[0].mensaje,
            fecha: p.comunicaciones[0].createdAt,
            de: p.comunicaciones[0].remitente.fullName,
            estado: p.comunicaciones[0].estado,
          }
        : null,
      pendientes: p._count.comunicaciones,
    }));
  }

  async getMensajes(postulacionId: string, actor: { userId: string; role: string }) {
    const postulacion = await this.getPostulacionOrThrow(postulacionId);
    this.assertAccess(postulacion, actor);

    const mensajes = await this.prisma.comunicacionPostulacion.findMany({
      where: { postulacionId },
      include: {
        remitente: { select: { id: true, fullName: true, role: true } },
        destinatario: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Marcar como LEIDO los dirigidos al actor que estaban PENDIENTE
    await this.prisma.comunicacionPostulacion.updateMany({
      where: {
        postulacionId,
        destinatarioId: actor.userId,
        estado: ComunicacionEstado.PENDIENTE,
      },
      data: { estado: ComunicacionEstado.LEIDO },
    });

    return {
      postulacion: {
        id: postulacion.id,
        status: postulacion.status,
        candidato: postulacion.user,
        oferta: postulacion.oferta,
        submittedBy: postulacion.submittedBy,
      },
      mensajes: mensajes.map((m) => ({
        id: m.id,
        fecha: m.createdAt,
        remitente: m.remitente,
        destinatario: m.destinatario,
        mensaje: m.mensaje,
        estado: m.estado,
        esMio: m.remitenteId === actor.userId,
      })),
    };
  }

  async send(dto: SendComunicacionDto, actor: { userId: string; role: string; fullName?: string }) {
    if (!dto.mensaje?.trim()) {
      throw new BadRequestException('El mensaje no puede estar vacío.');
    }

    const postulacion = await this.getPostulacionOrThrow(dto.postulacionId);
    this.assertAccess(postulacion, actor);

    let destinatarioId = this.resolveDestinatario(postulacion, actor.userId, dto.destinatarioId);
    if (!destinatarioId) {
      const admin = await this.prisma.user.findFirst({
        where: { role: Role.ADMIN, deletedAt: null },
        select: { id: true },
      });
      destinatarioId = admin?.id;
    }
    if (!destinatarioId) {
      throw new BadRequestException('No se pudo determinar el destinatario del mensaje.');
    }
    if (destinatarioId === actor.userId) {
      throw new BadRequestException('El destinatario no puede ser el mismo remitente.');
    }

    // Si el destinatario tenía mensajes pendientes del actor, marcar respondidos
    await this.prisma.comunicacionPostulacion.updateMany({
      where: {
        postulacionId: dto.postulacionId,
        remitenteId: destinatarioId,
        destinatarioId: actor.userId,
        estado: { in: [ComunicacionEstado.PENDIENTE, ComunicacionEstado.LEIDO] },
      },
      data: { estado: ComunicacionEstado.RESPONDIDO },
    });

    const created = await this.prisma.comunicacionPostulacion.create({
      data: {
        postulacionId: dto.postulacionId,
        remitenteId: actor.userId,
        destinatarioId,
        mensaje: dto.mensaje.trim(),
        estado: ComunicacionEstado.PENDIENTE,
      },
      include: {
        remitente: { select: { id: true, fullName: true, role: true } },
        destinatario: { select: { id: true, fullName: true, role: true } },
      },
    });

    await this.notificacionesService.registrarNotificacionPublic({
      usuarioId: destinatarioId,
      mensaje: `Nuevo mensaje en postulación "${postulacion.oferta.title}" de ${actor.fullName || 'un usuario'}: ${dto.mensaje.trim().slice(0, 80)}`,
      tipo: TipoNotificacion.PROCESO,
    });

    return {
      id: created.id,
      fecha: created.createdAt,
      remitente: created.remitente,
      destinatario: created.destinatario,
      mensaje: created.mensaje,
      estado: created.estado,
      esMio: true,
    };
  }

  async updateEstado(
    id: string,
    estado: ComunicacionEstado,
    actor: { userId: string; role: string },
  ) {
    const msg = await this.prisma.comunicacionPostulacion.findUnique({ where: { id } });
    if (!msg) throw new NotFoundException('Mensaje no encontrado');

    const postulacion = await this.getPostulacionOrThrow(msg.postulacionId);
    this.assertAccess(postulacion, actor);

    if (msg.destinatarioId !== actor.userId && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Solo el destinatario puede actualizar el estado del mensaje.');
    }

    return this.prisma.comunicacionPostulacion.update({
      where: { id },
      data: { estado },
    });
  }
}
