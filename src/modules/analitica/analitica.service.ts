import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContractStatus } from '@prisma/client';

@Injectable()
export class AnaliticaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna indicadores clave para el monitoreo de paz social y empleo local.
   */
  async getIndicadoresClave() {
    const [totalContratados, totalContratos, contratosFinalizados, totalComuneros, genderDistribution] = await Promise.all([
      this.prisma.contrato.count({ where: { status: ContractStatus.ACTIVO } }),
      this.prisma.contrato.count(),
      this.prisma.contrato.count({ where: { status: ContractStatus.VENCIDO } }),
      this.prisma.user.count({ where: { role: 'COMUNERO' } }),
      this.prisma.user.groupBy({
        by: ['gender'],
        _count: { gender: true },
        where: { role: 'COMUNERO' },
      }),
    ]);

    // Cálculo de rotación simple: (finalizados / total) * 100
    const rotacionLaboral = totalContratos > 0 
      ? (contratosFinalizados / totalContratos) * 100 
      : 0;

    // Cumplimiento: % de comuneros con contrato activo vs total comuneros
    const cumplimientoLocal = totalComuneros > 0 
      ? (totalContratados / totalComuneros) * 100 
      : 0;

    // Formatear distribución de género
    const participacionGenero = genderDistribution.reduce((acc: any, curr) => {
      const label = curr.gender || 'SIN_DEFINIR';
      acc[label] = curr._count.gender;
      return acc;
    }, {});

    const porcentajeFemenino = totalComuneros > 0 
      ? ((participacionGenero['FEMENINO'] || 0) / totalComuneros) * 100 
      : 0;

    return {
      totalContratados,
      rotacionLaboral: parseFloat(rotacionLaboral.toFixed(2)),
      cumplimientoLocal: parseFloat(cumplimientoLocal.toFixed(2)),
      totalComuneros,
      participacionFemenina: parseFloat(porcentajeFemenino.toFixed(2)),
      distribucionGenero: participacionGenero,
      timestamp: new Date(),
    };
  }

  /**
   * Identifica brechas de competencias cruzando ofertas vs talento disponible.
   */
  async getBrechasCompetencias() {
    // 1. Obtener todas las habilidades requeridas en ofertas abiertas
    const ofertas = await this.prisma.oferta.findMany({
      where: { status: 'ABIERTA' },
      select: { requirements: true },
    });

    const skillsRequeridas = new Set<string>();
    ofertas.forEach(o => {
      const reqs = o.requirements as any;
      if (reqs && Array.isArray(reqs.skills)) {
        reqs.skills.forEach((s: string) => skillsRequeridas.add(s.toLowerCase()));
      }
    });

    // 2. Obtener todas las habilidades que tienen los comuneros
    const habilidadesExistentes = await this.prisma.habilidad.findMany({
      select: { name: true },
    });

    const skillsDisponibles = new Set(
      habilidadesExistentes.map(h => h.name.toLowerCase())
    );

    // 3. Calcular brecha: Requeridas pero NO disponibles
    const brechas = Array.from(skillsRequeridas).filter(
      skill => !skillsDisponibles.has(skill)
    );

    return {
      totalSkillsRequeridas: skillsRequeridas.size,
      totalSkillsDisponibles: skillsDisponibles.size,
      brechasIdentificadas: brechas,
      recomendacion: brechas.length > 0 
        ? `Se recomienda abrir programas de capacitación en: ${brechas.join(', ')}`
        : 'El talento local cubre las demandas actuales.',
    };
  }
}
