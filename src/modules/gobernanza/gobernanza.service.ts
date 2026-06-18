import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class GobernanzaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Valida si una oferta cumple con la cuota de contratación local.
   * Por defecto, se espera un 80% de contratación local según actas.
   */
  async validarCuotaLocal(ofertaId: string) {
    const oferta = await this.prisma.oferta.findUnique({
      where: { id: ofertaId },
    });

    if (!oferta) return { error: 'Oferta no encontrada' };

    // En una implementación real, buscaríamos el acuerdo específico para esta empresa/sector
    const cuotaMinima = 0.80; // 80%

    // Obtenemos el total de trabajadores actuales en ese sector
    const totalTrabajadoresSector = await this.prisma.contrato.count({
      where: { 
        status: 'ACTIVO',
        user: { sector: oferta.sector }
      }
    });

    const totalComunerosSector = await this.prisma.user.count({
      where: { 
        role: 'COMUNERO',
        sector: oferta.sector
      }
    });

    const porcentajeActual = totalComunerosSector > 0 
      ? (totalTrabajadoresSector / totalComunerosSector) 
      : 0;

    const cumple = porcentajeActual >= cuotaMinima;

    return {
      ofertaId,
      sector: oferta.sector,
      cuotaMinima: cuotaMinima * 100,
      porcentajeActual: parseFloat((porcentajeActual * 100).toFixed(2)),
      cumple,
      alerta: !cumple ? `ALERTA: El sector ${oferta.sector} tiene un déficit de contratación local.` : null
    };
  }

  /**
   * Dashboard para la Directiva Comunal
   */
  async getDashboardDirectiva() {
    const sectores = await this.prisma.user.groupBy({
      by: ['sector'],
      _count: { _all: true },
      where: { role: 'COMUNERO' }
    });

    const statsSectores = await Promise.all(sectores.map(async (s) => {
      const sector = s.sector || 'SIN_SECTOR';
      const total = s._count._all;
      const contratados = await this.prisma.contrato.count({
        where: { 
          status: 'ACTIVO',
          user: { sector: sector }
        }
      });

      return {
        sector,
        totalComuneros: total,
        contratados,
        empleabilidad: total > 0 ? parseFloat(((contratados / total) * 100).toFixed(2)) : 0
      };
    }));

    return {
      resumenSectores: statsSectores,
      totalComuneros: statsSectores.reduce((acc, curr) => acc + curr.totalComuneros, 0),
      totalContratados: statsSectores.reduce((acc, curr) => acc + curr.contratados, 0),
      timestamp: new Date()
    };
  }
}
