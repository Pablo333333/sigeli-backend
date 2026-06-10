import { Injectable, NotFoundException, InternalServerErrorException, UseInterceptors } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCapacitacionDto } from './dto/create-capacitacion.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Prisma } from '@prisma/client';

@Injectable()
@UseInterceptors(AuditInterceptor)
export class CapacitacionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra un nuevo programa de capacitación.
   */
  async createPrograma(dto: CreateCapacitacionDto) {
    try {
      return await this.prisma.capacitacion.create({
        data: {
          title: dto.title,
          description: dto.description,
          sector: dto.sector,
          learningPath: dto.learningPath as Prisma.JsonObject || {},
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(`Error al crear programa: ${error.message}`);
    }
  }

  /**
   * Vincula a un comunero con un programa de capacitación.
   */
  async vincularTalento(userId: string, capacitacionId: string) {
    try {
      return await this.prisma.capacitacionUsuario.create({
        data: {
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

  /**
   * Actualiza el avance de un usuario y certifica si llega al 100%.
   */
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

      // Si se certifica, actualizamos automáticamente las habilidades en el CV y otorgamos puntos
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

  /**
   * Otorga puntos al usuario como parte del sistema de gamificación.
   */
  private async otorgarPuntos(userId: string, puntos: number, motivo: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { points: { increment: puntos } },
    });
    console.log(`[GAMIFICACIÓN] Usuario ${userId} ganó ${puntos} puntos por: ${motivo}`);
  }

  /**
   * Obtiene la ruta de aprendizaje (programas vinculados) de un comunero.
   */
  async getRutaAprendizaje(userId: string) {
    return this.prisma.capacitacionUsuario.findMany({
      where: { userId },
      include: {
        capacitacion: true,
      },
    });
  }

  /**
   * Lógica interna para añadir la habilidad al CV tras la certificación.
   */
  private async actualizarHabilidadesCV(userId: string, skillName: string) {
    const cv = await this.prisma.cV.findUnique({
      where: { userId },
    });

    if (cv) {
      await this.prisma.habilidad.create({
        data: {
          cvId: cv.id,
          name: skillName,
          isVerified: true, // Certificación dual automática
        },
      });
    }
  }
}
