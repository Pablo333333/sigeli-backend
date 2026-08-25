import { Injectable, NotFoundException, InternalServerErrorException, UseInterceptors } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCapacitacionDto, UpsertEncuestaEntrenamientoDto } from './dto/create-capacitacion.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Prisma, TipoCapacitacion } from '@prisma/client';

@Injectable()
@UseInterceptors(AuditInterceptor)
export class CapacitacionService {
  constructor(private readonly prisma: PrismaService) {}

  async createPrograma(dto: CreateCapacitacionDto) {
    try {
      return await this.prisma.capacitacion.create({
        data: {
          title: dto.title,
          description: dto.description,
          sector: dto.sector,
          learningPath: (dto.learningPath as Prisma.JsonObject) || {},
          tipo: dto.tipo || TipoCapacitacion.CV_HISTORIAL,
          socioOrganizador: dto.socioOrganizador || null,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(`Error al crear programa: ${error.message}`);
    }
  }

  async vincularTalento(userId: string, capacitacionId: string) {
    try {
      return await this.prisma.capacitacionUsuario.upsert({
        where: {
          userId_capacitacionId: { userId, capacitacionId },
        },
        update: {},
        create: {
          userId,
          capacitacionId,
          progress: 0,
          isCertified: false,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(`Error al vincular talento: ${error.message}`);
    }
  }

  async registrarAvance(userId: string, capacitacionId: string, progress: number) {
    try {
      const registro = await this.prisma.capacitacionUsuario.findFirst({
        where: { userId, capacitacionId },
      });

      if (!registro) {
        throw new NotFoundException('Registro de capacitación no encontrado para este usuario');
      }

      const isCertified = progress >= 100;

      const updated = await this.prisma.capacitacionUsuario.update({
        where: { id: registro.id },
        data: {
          progress,
          isCertified: isCertified ? true : registro.isCertified,
        },
        include: {
          capacitacion: true,
        },
      });

      if (isCertified) {
        await Promise.all([
          this.actualizarHabilidadesCV(userId, updated.capacitacion.title),
          this.otorgarPuntos(userId, 100, `Certificación en ${updated.capacitacion.title}`),
        ]);
      }

      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(`Error al registrar avance: ${error.message}`);
    }
  }

  async getRutaAprendizaje(userId: string, tipo?: TipoCapacitacion) {
    return this.prisma.capacitacionUsuario.findMany({
      where: {
        userId,
        ...(tipo
          ? { capacitacion: { tipo, deletedAt: null } }
          : { capacitacion: { deletedAt: null } }),
      },
      include: { capacitacion: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async actualizarHabilidadesCV(userId: string, skillName: string) {
    const cv = await this.prisma.cV.findUnique({ where: { userId } });
    if (cv) {
      await this.prisma.habilidad.create({
        data: { cvId: cv.id, name: skillName, isVerified: true },
      });
    }
  }

  private async otorgarPuntos(userId: string, puntos: number, _motivo: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { points: { increment: puntos } },
    });
  }

  async findAll(tipo?: TipoCapacitacion) {
    return this.prisma.capacitacion.findMany({
      where: {
        deletedAt: null,
        ...(tipo ? { tipo } : {}),
      },
      include: { usuarios: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMetricasIA() {
    const [totalComuneros, comunerosEnProgreso] = await Promise.all([
      this.prisma.user.count({ where: { role: 'COMUNERO', deletedAt: null } }),
      this.prisma.user.count({
        where: {
          role: 'COMUNERO',
          deletedAt: null,
          capacitaciones: {
            some: { progress: { gt: 0 }, isCertified: false },
          },
        },
      }),
    ]);

    const porcentajeAscenso =
      totalComuneros > 0 ? Math.round((comunerosEnProgreso / totalComuneros) * 100) : 0;

    return {
      porcentajeAscenso,
      totalComuneros,
      comunerosEnProgreso,
      timestamp: new Date(),
    };
  }

  /** Encuesta del programa de entrenamiento laboral (1 por comunero) */
  async getEncuesta(userId: string) {
    return this.prisma.encuestaEntrenamientoLaboral.findUnique({
      where: { userId },
    });
  }

  async upsertEncuesta(userId: string, dto: UpsertEncuestaEntrenamientoDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const data = {
      capacitadoPorAntamina: dto.capacitadoPorAntamina,
      anioParticipacion: dto.capacitadoPorAntamina ? dto.anioParticipacion ?? null : null,
      socioOrganizador: dto.capacitadoPorAntamina ? dto.socioOrganizador ?? null : null,
      nombrePrograma: dto.capacitadoPorAntamina ? dto.nombrePrograma ?? null : null,
      horas: dto.capacitadoPorAntamina ? dto.horas ?? null : null,
      temas: dto.capacitadoPorAntamina ? dto.temas ?? null : null,
      obtuvoCertificado: dto.capacitadoPorAntamina ? !!dto.obtuvoCertificado : false,
      observaciones: dto.observaciones ?? null,
      respuestas: (dto.respuestas as Prisma.JsonObject) || undefined,
    };

    return this.prisma.encuestaEntrenamientoLaboral.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  /**
   * Participantes del programa de entrenamiento (para dashboard):
   * encuesta SI + inscritos en cursos tipo PROGRAMA_ENTRENAMIENTO (unión).
   */
  async countParticipantesEntrenamiento(comuneroUserIds?: string[]) {
    const encuestaWhere: Prisma.EncuestaEntrenamientoLaboralWhereInput = {
      capacitadoPorAntamina: true,
      ...(comuneroUserIds ? { userId: { in: comuneroUserIds } } : {}),
    };

    const [fromEncuesta, fromCursos] = await Promise.all([
      this.prisma.encuestaEntrenamientoLaboral.findMany({
        where: encuestaWhere,
        select: { userId: true },
      }),
      this.prisma.capacitacionUsuario.findMany({
        where: {
          capacitacion: { tipo: TipoCapacitacion.PROGRAMA_ENTRENAMIENTO, deletedAt: null },
          ...(comuneroUserIds ? { userId: { in: comuneroUserIds } } : {}),
        },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);

    const set = new Set<string>();
    fromEncuesta.forEach((e) => set.add(e.userId));
    fromCursos.forEach((e) => set.add(e.userId));
    return set.size;
  }
}
