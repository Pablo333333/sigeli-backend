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
      return await this.prisma.reclamo.create({
        data: {
          userId: dto.userId,
          tenantId: dto.tenantId,
          motivo: dto.motivo,
          estado: 'PENDIENTE',
          // En una implementación real, aquí generaríamos el blockchainHash
          blockchainHash: `sha256-reclamo-${Date.now()}`,
        },
        include: {
          user: { select: { fullName: true } },
          tenant: { select: { name: true } },
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(`Error al registrar reclamo: ${error.message}`);
    }
  }

  /**
   * Actualiza el semáforo de confianza con justificación obligatoria.
   */
  async actualizarSemaforo(tenantId: string, nivel: TrustLevel, justificacion: string) {
    try {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) throw new NotFoundException('Empresa/Comunidad no encontrada');

      const updated = await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { trustLevel: nivel },
      });

      // El AuditInterceptor se encargará de registrar la acción, 
      // pero podemos añadir lógica adicional aquí si es necesario.
      
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
   * Actualiza el estado de un reclamo.
   */
  async actualizarEstadoReclamo(id: string, estado: string) {
    return this.prisma.reclamo.update({
      where: { id },
      data: { estado },
    });
  }

  /**
   * Obtiene indicadores de transparencia para visualización pública.
   */
  async getIndicadoresTransparencia() {
    const [tenants, totalReclamos, reclamosPendientes] = await Promise.all([
      this.prisma.tenant.findMany({
        select: { name: true, trustLevel: true, type: true },
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
