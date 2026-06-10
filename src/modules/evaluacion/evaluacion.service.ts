import { Injectable, InternalServerErrorException, UseInterceptors } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateEvaluacionDto } from './dto/create-evaluacion.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Prisma } from '@prisma/client';

@Injectable()
@UseInterceptors(AuditInterceptor)
export class EvaluacionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra una evaluación 360° y procesa el sentimiento del feedback.
   */
  async registrarEvaluacion(dto: CreateEvaluacionDto) {
    try {
      // Mock de procesamiento de sentimiento por IA
      const sentimientoIA = this.procesarSentimientoMock(dto.feedbackTexto || '');

      return await this.prisma.evaluacion.create({
        data: {
          contractId: dto.contractId,
          evaluatorId: dto.evaluatorId,
          evaluadoId: dto.evaluadoId,
          satisfaccion: dto.satisfaccion,
          discriminacion: dto.discriminacion,
          feedbackTexto: dto.feedbackTexto,
          grabacionUrl: dto.grabacionUrl,
          sentimientoIA: sentimientoIA as Prisma.JsonObject,
        },
        include: {
          evaluado: { select: { fullName: true } },
          contract: { select: { regimenLaboral: true } },
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(`Error al registrar evaluación: ${error.message}`);
    }
  }

  /**
   * Mock de análisis de sentimiento IA.
   */
  private procesarSentimientoMock(texto: string) {
    const palabrasPositivas = ['excelente', 'bueno', 'gran', 'feliz', 'contento'];
    const palabrasNegativas = ['malo', 'pobre', 'triste', 'problema', 'queja'];

    let score = 0.5; // Neutro por defecto
    const lowerTexto = texto.toLowerCase();

    palabrasPositivas.forEach(p => { if (lowerTexto.includes(p)) score += 0.1; });
    palabrasNegativas.forEach(p => { if (lowerTexto.includes(p)) score -= 0.1; });

    return {
      score: Math.max(0, Math.min(1, score)),
      emocionDominante: score > 0.6 ? 'POSITIVA' : score < 0.4 ? 'NEGATIVA' : 'NEUTRA',
      analizadoEn: new Date().toISOString(),
    };
  }

  async findByEvaluado(evaluadoId: string) {
    return this.prisma.evaluacion.findMany({
      where: { evaluadoId },
      include: {
        contract: true,
      },
    });
  }
}
