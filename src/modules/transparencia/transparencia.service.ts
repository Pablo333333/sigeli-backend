import { Injectable, InternalServerErrorException, UseInterceptors, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateReclamoDto } from './dto/create-reclamo.dto';
import { TrustLevel } from '@prisma/client';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Injectable()
@UseInterceptors(AuditInterceptor)
export class TransparenciaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra un reclamo de forma inmutable.
   */
  async registrarReclamo(dto: CreateReclamoDto) {
    try {
      if (!dto.userId) {
        throw new InternalServerErrorException('userId es requerido para registrar un reclamo.');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { tenantId: true, fullName: true }
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado para registrar el reclamo.');
      }

      let tenantId = dto.tenantId;
      if (!tenantId) {
        const minera = await this.prisma.tenant.findFirst({
          where: { type: 'MINERA' },
          select: { id: true },
        });
        tenantId = minera?.id || user.tenantId;
      }

      if (!tenantId) {
        throw new InternalServerErrorException('No se pudo determinar la empresa involucrada (tenantId).');
      }

      const motivoParts = [
        dto.categoria,
        dto.motivo,
        dto.descripcion,
      ].filter((part) => !!part && String(part).trim().length > 0);

      return await this.prisma.reclamo.create({
        data: {
          userId: dto.userId,
          tenantId,
          motivo: motivoParts.join(' | '),
          estado: 'PENDIENTE',
          blockchainHash: `sha256-reclamo-${Date.now()}`,
        },
        include: {
          user: { select: { fullName: true } },
          tenant: { select: { name: true } },
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(`Error al registrar reclamo: ${error.message}`);
    }
  }

  /**
   * Actualiza el semáforo de confianza con justificación obligatoria.
   */
  async actualizarSemaforo(tenantId: string, nivel: TrustLevel, justificacion: string, userId?: string) {
    try {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) throw new NotFoundException('Empresa/Comunidad no encontrada');

      const nivelAnterior = tenant.trustLevel;

      const updated = await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { trustLevel: nivel },
      });

      // Guardamos en el historial para auditoría social
      await this.prisma.semaforoHistory.create({
        data: {
          tenantId,
          nivelAnterior,
          nivelNuevo: nivel,
          justificacion,
          userId,
        },
      });
      
      return {
        tenant: updated.name,
        nuevoNivel: nivel,
        justificacion,
        timestamp: new Date(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(`Error al actualizar semáforo: ${error.message}`);
    }
  }

  /**
   * Obtiene todos los reclamos registrados.
   */
  async getReclamos() {
    return this.prisma.reclamo.findMany({
      include: {
        user: { select: { fullName: true, dni: true } },
        tenant: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Actualiza el estado de un reclamo y añade respuesta oficial.
   */
  async actualizarEstadoReclamo(id: string, estado: string, respuestaOficial?: string) {
    return this.prisma.reclamo.update({
      where: { id },
      data: { 
        estado,
        respuestaOficial: respuestaOficial || undefined
      },
    });
  }

  /**
   * Obtiene indicadores de transparencia para visualización pública.
   */
  async getIndicadoresTransparencia() {
    const [tenants, totalReclamos, reclamosPendientes] = await Promise.all([
      this.prisma.tenant.findMany({
        select: { id: true, name: true, trustLevel: true, type: true },
      }),
      this.prisma.reclamo.count(),
      this.prisma.reclamo.count({ where: { estado: 'PENDIENTE' } }),
    ]);

    return {
      semaforos: tenants,
      estadisticasReclamos: {
        total: totalReclamos,
        pendientes: reclamosPendientes,
        tasaResolucion: totalReclamos > 0 
          ? ((totalReclamos - reclamosPendientes) / totalReclamos) * 100 
          : 100,
      },
      fechaReporte: new Date(),
    };
  }
}
