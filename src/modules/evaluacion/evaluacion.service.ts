import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateEvaluacionDto } from './dto/create-evaluacion.dto';
import { ContractStatus, Prisma, Role } from '@prisma/client';

@Injectable()
export class EvaluacionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Contratos activos elegibles para evaluación 360°.
   * - COMUNERO: solo los propios
   * - EMPRESA / ADMIN: todos los activos (opcionalmente filtrados)
   */
  async getContratosElegibles(userId: string, role: string) {
    const where: Prisma.ContratoWhereInput = {
      status: ContractStatus.ACTIVO,
      deletedAt: null,
      endDate: { gte: new Date() },
    };

    if (role === Role.COMUNERO) {
      where.userId = userId;
    }

    const contratos = await this.prisma.contrato.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, dni: true } },
        postulacion: {
          include: {
            oferta: {
              select: {
                id: true,
                title: true,
                companyName: true,
                sector: true,
              },
            },
          },
        },
        evaluaciones: {
          where: { deletedAt: null },
          select: { id: true, createdAt: true, evaluatorId: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { startDate: 'desc' },
    });

    return contratos.map((c) => ({
      id: c.id,
      startDate: c.startDate,
      endDate: c.endDate,
      salary: c.salary,
      regimenLaboral: c.regimenLaboral,
      status: c.status,
      trabajador: c.user,
      oferta: c.postulacion?.oferta || null,
      yaEvaluadoPorMi: c.evaluaciones.some((e) => e.evaluatorId === userId),
      ultimaEvaluacion: c.evaluaciones[0] || null,
    }));
  }

  /**
   * Registra evaluación 360° solo si el contrato está ACTIVO.
   */
  async registrarEvaluacion(
    dto: CreateEvaluacionDto,
    evaluatorId: string,
    role: string,
  ) {
    try {
      const contrato = await this.prisma.contrato.findFirst({
        where: {
          id: dto.contractId,
          deletedAt: null,
        },
        include: {
          user: { select: { id: true, fullName: true } },
        },
      });

      if (!contrato) {
        throw new NotFoundException('Contrato no encontrado');
      }

      if (contrato.status !== ContractStatus.ACTIVO) {
        throw new BadRequestException(
          'Solo se pueden evaluar comuneros con contrato ACTIVO',
        );
      }

      if (contrato.endDate < new Date()) {
        throw new BadRequestException(
          'El contrato ya venció; no es elegible para evaluación 360°',
        );
      }

      if (role === Role.COMUNERO && contrato.userId !== evaluatorId) {
        throw new ForbiddenException(
          'Solo puedes evaluar tu propio contrato activo',
        );
      }

      const existing = await this.prisma.evaluacion.findFirst({
        where: {
          contractId: dto.contractId,
          evaluatorId,
          deletedAt: null,
        },
      });

      if (existing) {
        throw new ConflictException(
          'Ya registraste una evaluación 360° para este contrato',
        );
      }

      const q = dto.cuestionario;
      const sentimientoIA = this.procesarSentimientoMock(q.comentarios || '');

      return await this.prisma.evaluacion.create({
        data: {
          contractId: dto.contractId,
          evaluatorId,
          evaluadoId: contrato.userId,
          satisfaccion: q.satisfaccionGeneral,
          discriminacion: q.discriminacion,
          cuestionario: q as unknown as Prisma.JsonObject,
          feedbackTexto: q.comentarios || null,
          grabacionUrl: dto.grabacionUrl || null,
          sentimientoIA: sentimientoIA as Prisma.JsonObject,
        },
        include: {
          evaluado: { select: { fullName: true, dni: true } },
          contract: {
            select: {
              regimenLaboral: true,
              startDate: true,
              endDate: true,
              postulacion: {
                select: {
                  oferta: { select: { title: true, companyName: true } },
                },
              },
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al registrar evaluación: ${error.message}`,
      );
    }
  }

  private procesarSentimientoMock(texto: string) {
    const palabrasPositivas = ['excelente', 'bueno', 'gran', 'feliz', 'contento', 'bien'];
    const palabrasNegativas = ['malo', 'pobre', 'triste', 'problema', 'queja', 'discrimin'];

    let score = 0.5;
    const lowerTexto = texto.toLowerCase();

    palabrasPositivas.forEach((p) => {
      if (lowerTexto.includes(p)) score += 0.1;
    });
    palabrasNegativas.forEach((p) => {
      if (lowerTexto.includes(p)) score -= 0.1;
    });

    return {
      score: Math.max(0, Math.min(1, score)),
      emocionDominante: score > 0.6 ? 'POSITIVA' : score < 0.4 ? 'NEGATIVA' : 'NEUTRA',
      analizadoEn: new Date().toISOString(),
    };
  }

  async findByEvaluado(evaluadoId: string) {
    return this.prisma.evaluacion.findMany({
      where: { evaluadoId, deletedAt: null },
      include: {
        contract: {
          include: {
            postulacion: {
              select: { oferta: { select: { title: true, companyName: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMisEvaluaciones(evaluatorId: string) {
    return this.prisma.evaluacion.findMany({
      where: { evaluatorId, deletedAt: null },
      include: {
        evaluado: { select: { fullName: true, dni: true } },
        contract: {
          include: {
            postulacion: {
              select: { oferta: { select: { title: true, companyName: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
