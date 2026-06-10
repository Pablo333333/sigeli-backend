import { Injectable, NotFoundException, InternalServerErrorException, UseInterceptors } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePostulacionDto } from './dto/create-postulacion.dto';
import { ApplicationStatus, Prisma } from '@prisma/client';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Injectable()
@UseInterceptors(AuditInterceptor)
export class PostulacionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Inicia un proceso de postulación con el estado inicial y timeline.
   */
  async createPostulacion(dto: CreatePostulacionDto) {
    const { userId, ofertaId } = dto;

    try {
      // Verificar existencia de usuario y oferta
      const [user, oferta] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: userId } }),
        this.prisma.oferta.findUnique({ where: { id: ofertaId } }),
      ]);

      if (!user) throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
      if (!oferta) throw new NotFoundException(`Oferta con ID ${ofertaId} no encontrada`);

      const initialTimeline = [
        {
          status: ApplicationStatus.PRESENTACION_CV,
          date: new Date().toISOString(),
          notes: 'Inicio del proceso de postulación',
        },
      ];

      return await this.prisma.postulacion.create({
        data: {
          userId,
          ofertaId,
          status: ApplicationStatus.PRESENTACION_CV,
          timeline: initialTimeline as unknown as Prisma.JsonArray,
        },
        include: {
          user: { select: { fullName: true, dni: true } },
          oferta: { select: { title: true, sector: true } },
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(`Error al crear postulación: ${error.message}`);
    }
  }

  /**
   * Actualiza el estado de la postulación y añade un evento al timeline.
   */
  async updateStatus(id: string, newStatus: ApplicationStatus, notes?: string) {
    try {
      const postulacion = await this.prisma.postulacion.findUnique({
        where: { id },
      });

      if (!postulacion) {
        throw new NotFoundException(`Postulación con ID ${id} no encontrada`);
      }

      const currentTimeline = (postulacion.timeline as any[]) || [];
      const updatedTimeline = [
        ...currentTimeline,
        {
          status: newStatus,
          date: new Date().toISOString(),
          notes: notes || `Cambio de estado a ${newStatus}`,
        },
      ];

      return await this.prisma.postulacion.update({
        where: { id },
        data: {
          status: newStatus,
          timeline: updatedTimeline as unknown as Prisma.JsonArray,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(`Error al actualizar estado: ${error.message}`);
    }
  }

  async findByUserId(userId: string) {
    return this.prisma.postulacion.findMany({
      where: { userId },
      include: {
        oferta: { select: { title: true, sector: true } },
        contrato: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const postulacion = await this.prisma.postulacion.findUnique({
      where: { id },
      include: {
        user: true,
        oferta: true,
        contrato: true,
      },
    });

    if (!postulacion) throw new NotFoundException(`Postulación con ID ${id} no encontrada`);
    return postulacion;
  }
}
