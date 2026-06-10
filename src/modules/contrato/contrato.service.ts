import { Injectable, NotFoundException, InternalServerErrorException, UseInterceptors, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateContratoDto } from './dto/create-contrato.dto';
import { PostulacionService } from '../postulacion/postulacion.service';
import { BiometriaService } from '../../common/services/biometria.service';
import { ApplicationStatus, ContractStatus, Prisma } from '@prisma/client';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Injectable()
@UseInterceptors(AuditInterceptor)
export class ContratoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postulacionService: PostulacionService,
    private readonly biometriaService: BiometriaService,
  ) {}

  /**
   * Formaliza la contratación de un comunero con validación biométrica.
   */
  async createContrato(dto: CreateContratoDto) {
    const { postulacionId, startDate, endDate, salary, regimenLaboral, biometricToken } = dto;

    try {
      // 1. Obtener la postulación y verificar que exista
      const postulacion = await this.prisma.postulacion.findUnique({
        where: { id: postulacionId },
        include: { user: true },
      });

      if (!postulacion) {
        throw new NotFoundException(`Postulación con ID ${postulacionId} no encontrada`);
      }

      // 2. VALIDACIÓN BIOMÉTRICA OBLIGATORIA
      await this.biometriaService.validarIdentidad(postulacion.userId, biometricToken);

      // 3. Verificar si ya existe un contrato para esta postulación
      const existingContrato = await this.prisma.contrato.findUnique({
        where: { postulacionId },
      });

      if (existingContrato) {
        throw new ConflictException('Ya existe un contrato formalizado para esta postulación');
      }

      // 3. Calcular estabilidad laboral (Stability Index)
      // Sumamos la duración de contratos previos del mismo usuario
      const previousContracts = await this.prisma.contrato.findMany({
        where: { userId: postulacion.userId },
      });

      let totalDays = 0;
      previousContracts.forEach(c => {
        const diff = new Date(c.endDate).getTime() - new Date(c.startDate).getTime();
        totalDays += Math.ceil(diff / (1000 * 3600 * 24));
      });

      // El índice de estabilidad podría ser el total de meses acumulados
      const stabilityIndex = new Prisma.Decimal(totalDays / 30);

      // 4. Crear el contrato
      const contrato = await this.prisma.contrato.create({
        data: {
          postulacionId,
          userId: postulacion.userId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          salary: new Prisma.Decimal(salary),
          regimenLaboral,
          status: ContractStatus.ACTIVO,
          stabilityIndex,
        },
      });

      // 5. Actualizar automáticamente el estado de la postulación a CONTRATADO
      await this.postulacionService.updateStatus(
        postulacionId,
        ApplicationStatus.CONTRATADO,
        `Contrato formalizado bajo régimen ${regimenLaboral}.`,
      );

      return contrato;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) throw error;
      throw new InternalServerErrorException(`Error al formalizar contrato: ${error.message}`);
    }
  }

  /**
   * Obtiene contratos que vencen en los próximos N días.
   */
  async getContratosProximosAVencer(dias: number) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dias);

    return this.prisma.contrato.findMany({
      where: {
        status: ContractStatus.ACTIVO,
        endDate: {
          lte: targetDate,
          gte: new Date(),
        },
      },
      include: {
        user: {
          select: {
            fullName: true,
            phone: true,
            dni: true,
          },
        },
      },
    });
  }
}
