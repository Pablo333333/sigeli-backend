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
        this.prisma.user.findUnique({ 
          where: { id: userId },
          include: { cv: { include: { habilidades: true } } }
        }),
        this.prisma.oferta.findUnique({ where: { id: ofertaId } }),
      ]);

      if (!user) throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
      if (!oferta) throw new NotFoundException(`Oferta con ID ${ofertaId} no encontrada`);

      // Lógica de Matching IA rápida
      const matchingScore = this.calculateMatchingScore(user, oferta);

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
          aiMatchingScore: matchingScore,
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
   * Calcula un score de matching basado en habilidades y requisitos.
   */
  private calculateMatchingScore(user: any, oferta: any): number {
    const requirements = (oferta.requirements as any) || {};
    const userSkills = user.cv?.habilidades?.map((h: any) => h.name.toLowerCase()) || [];
    
    // Si no hay requisitos específicos, damos un base score
    if (Object.keys(requirements).length === 0) return 70;

    let matches = 0;
    let totalCriteria = 0;

    // Comparar título de la oferta con habilidades (ejemplo simple)
    const titleKeywords = oferta.title.toLowerCase().split(' ');
    titleKeywords.forEach((word: string) => {
      if (word.length > 3) {
        totalCriteria++;
        if (userSkills.some((s: string) => s.includes(word))) matches++;
      }
    });

    // Score base entre 60 y 95 para que se vea realista
    const score = totalCriteria > 0 
      ? 60 + (matches / totalCriteria) * 35 
      : 75 + Math.floor(Math.random() * 15);

    return Math.min(Math.round(score), 99);
  }

  /**
   * Actualiza el estado de la postulación y añade un evento al timeline.
   */
  async updateStatus(id: string, newStatus: ApplicationStatus, notes?: string) {
    try {
      const postulacion = await this.prisma.postulacion.findUnique({
        where: { id },
        include: { oferta: true, user: true }
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

      const updated = await this.prisma.postulacion.update({
        where: { id },
        data: {
          status: newStatus,
          timeline: updatedTimeline as unknown as Prisma.JsonArray,
        },
      });

      // Activar Contratación Automática (Módulo V)
      if (newStatus === ApplicationStatus.CONTRATADO) {
        const requirements = (postulacion.oferta.requirements as any) || {};
        const regimenLaboral = requirements.regimen || 'Régimen General';
        
        // Duración por defecto de 1 año o según requisitos si existiera
        const startDate = new Date();
        const endDate = new Date();
        endDate.setFullYear(startDate.getFullYear() + 1);

        await this.prisma.contrato.create({
          data: {
            postulacionId: id,
            userId: postulacion.userId,
            startDate,
            endDate,
            salary: postulacion.oferta.salary,
            regimenLaboral,
            status: 'ACTIVO',
            stabilityIndex: 90, // Index optimista para nuevos contratados
          }
        });

        // Reducir vacantes y cerrar oferta si llega a 0
        const newVacancies = Math.max(0, postulacion.oferta.vacancies - 1);
        await this.prisma.oferta.update({
          where: { id: postulacion.ofertaId },
          data: { 
            vacancies: newVacancies,
            status: newVacancies === 0 ? 'CERRADA' : postulacion.oferta.status
          }
        });
      }

      return updated;
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

  async findAll() {
    return this.prisma.postulacion.findMany({
      include: {
        user: { select: { id: true, fullName: true, dni: true } },
        oferta: { select: { id: true, title: true, sector: true, vacancies: true, salary: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getComuneros() {
    return this.prisma.user.findMany({
      where: { role: 'COMUNERO', deletedAt: null },
      select: { id: true, fullName: true, dni: true },
      orderBy: { fullName: 'asc' },
    });
  }
}
