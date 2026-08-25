import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContractStatus, Gender, OfertaStatus, Role, TipoCapacitacion, TipoManoObra } from '@prisma/client';
import { HeatmapLayer, HeatmapPoint, matchSectorGeografico } from './sector-geo.util';

export type DashboardFilters = {
  sector?: string;
  gender?: string;
  tipoManoObra?: string;
  anio?: number;
  tenantId?: string;
};

const AGE_BANDS = [
  { key: '18-20', min: 18, max: 20 },
  { key: '21-25', min: 21, max: 25 },
  { key: '26-30', min: 26, max: 30 },
  { key: '31-35', min: 31, max: 35 },
  { key: '>35', min: 36, max: 200 },
] as const;

const TIPO_MO_LABELS: Record<string, string> = {
  NO_CALIFICADA: 'No calificada',
  SEMI_CALIFICADA: 'Semi calificada',
  CALIFICADA: 'Calificada',
  PROFESIONAL: 'Profesional',
  TECNICO: 'Técnico',
  PRACTICAS: 'Prácticas profesionales',
};

@Injectable()
export class AnaliticaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Parsea fecha de nacimiento DDMMYYYY / ISO desde profileMeta del CV */
  private parseBirthDate(raw?: string | null): Date | null {
    if (!raw) return null;
    const digits = String(raw).replace(/[^\d]/g, '');
    if (digits.length === 8) {
      const dd = Number(digits.slice(0, 2));
      const mm = Number(digits.slice(2, 4));
      const yyyy = Number(digits.slice(4, 8));
      const d = new Date(yyyy, mm - 1, dd);
      if (d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd) return d;
    }
    const iso = new Date(raw);
    return Number.isNaN(iso.getTime()) ? null : iso;
  }

  private calcAge(birth: Date, ref = new Date()): number {
    let age = ref.getFullYear() - birth.getFullYear();
    const m = ref.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
    return age;
  }

  private ageBand(age: number): string | null {
    if (age < 18) return null;
    const band = AGE_BANDS.find((b) => age >= b.min && age <= b.max);
    return band?.key || null;
  }

  /**
   * Dashboard personalizado (Fase 5A) con filtros para Directiva / Empresa.
   */
  async getDashboardPersonalizado(filters: DashboardFilters = {}) {
    const anio = filters.anio || new Date().getFullYear();
    const yearStart = new Date(anio, 0, 1);
    const yearEnd = new Date(anio, 11, 31, 23, 59, 59);

    const comuneroWhere: any = {
      role: Role.COMUNERO,
      deletedAt: null,
      ...(filters.gender && Object.values(Gender).includes(filters.gender as Gender)
        ? { gender: filters.gender as Gender }
        : {}),
      ...(filters.sector ? { sector: { contains: filters.sector, mode: 'insensitive' } } : {}),
    };

    const ofertaWhere: any = {
      deletedAt: null,
      ...(filters.sector ? { sector: { contains: filters.sector, mode: 'insensitive' } } : {}),
      ...(filters.tipoManoObra &&
      Object.values(TipoManoObra).includes(filters.tipoManoObra as TipoManoObra)
        ? { tipoManoObra: filters.tipoManoObra as TipoManoObra }
        : {}),
      ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
    };

    const [
      comuneros,
      cvs,
      ofertasAll,
      ofertasAnio,
      contratosAll,
      contratosAnio,
      encuestaEntrenamiento,
      inscritosPrograma,
      reclamosPendientes,
      tenants,
      sectoresDisponibles,
      empresas,
    ] = await Promise.all([
      this.prisma.user.findMany({
        where: comuneroWhere,
        select: {
          id: true,
          gender: true,
          sector: true,
          fullName: true,
        },
      }),
      this.prisma.cV.findMany({
        where: { deletedAt: null, user: comuneroWhere },
        select: {
          userId: true,
          multimedia: true,
          yearsExperienceMining: true,
          specialty: true,
        },
      }),
      this.prisma.oferta.findMany({
        where: ofertaWhere,
        select: {
          id: true,
          tipoManoObra: true,
          status: true,
          sector: true,
          createdAt: true,
          vacancies: true,
        },
      }),
      this.prisma.oferta.findMany({
        where: { ...ofertaWhere, createdAt: { gte: yearStart, lte: yearEnd } },
        select: { id: true, createdAt: true, tipoManoObra: true },
      }),
      this.prisma.contrato.findMany({
        where: {
          ...(filters.tenantId || filters.tipoManoObra || filters.sector
            ? {
                postulacion: {
                  oferta: {
                    deletedAt: null,
                    ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
                    ...(filters.tipoManoObra
                      ? { tipoManoObra: filters.tipoManoObra as TipoManoObra }
                      : {}),
                    ...(filters.sector
                      ? { sector: { contains: filters.sector, mode: 'insensitive' } }
                      : {}),
                  },
                },
              }
            : {}),
        },
        include: {
          postulacion: {
            include: {
              oferta: {
                select: { sector: true, tipoManoObra: true, title: true },
              },
            },
          },
          user: { select: { id: true, gender: true, sector: true } },
        },
      }),
      this.prisma.contrato.findMany({
        where: {
          createdAt: { gte: yearStart, lte: yearEnd },
          ...(filters.tenantId || filters.tipoManoObra || filters.sector
            ? {
                postulacion: {
                  oferta: {
                    deletedAt: null,
                    ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
                    ...(filters.tipoManoObra
                      ? { tipoManoObra: filters.tipoManoObra as TipoManoObra }
                      : {}),
                    ...(filters.sector
                      ? { sector: { contains: filters.sector, mode: 'insensitive' } }
                      : {}),
                  },
                },
              }
            : {}),
        },
        select: {
          id: true,
          createdAt: true,
          status: true,
          postulacion: {
            select: { oferta: { select: { tipoManoObra: true } } },
          },
        },
      }),
      this.prisma.encuestaEntrenamientoLaboral.findMany({
        where: {
          capacitadoPorAntamina: true,
          user: comuneroWhere,
        },
        select: { userId: true },
      }),
      this.prisma.capacitacionUsuario.findMany({
        where: {
          user: comuneroWhere,
          capacitacion: {
            tipo: TipoCapacitacion.PROGRAMA_ENTRENAMIENTO,
            deletedAt: null,
          },
        },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.reclamo.count({ where: { estado: 'PENDIENTE' } }),
      this.prisma.tenant.findMany({ select: { id: true, name: true, type: true, trustLevel: true } }),
      this.prisma.user.findMany({
        where: { role: Role.COMUNERO, deletedAt: null, sector: { not: null } },
        select: { sector: true },
        distinct: ['sector'],
      }),
      this.prisma.tenant.findMany({
        where: { type: 'MINERA' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const cvByUser = new Map(cvs.map((c) => [c.userId, c]));

    // Participantes del programa de entrenamiento (encuesta SI ∪ inscritos PROGRAMA_ENTRENAMIENTO)
    const participantesEntrenamiento = new Set<string>();
    encuestaEntrenamiento.forEach((e) => participantesEntrenamiento.add(e.userId));
    inscritosPrograma.forEach((e) => participantesEntrenamiento.add(e.userId));

    // --- Género / interesados ---
    const totalComuneros = comuneros.length;
    const varones = comuneros.filter((c) => c.gender === Gender.MASCULINO).length;
    const mujeres = comuneros.filter((c) => c.gender === Gender.FEMENINO).length;
    const otrosGenero = totalComuneros - varones - mujeres;

    // --- Por sector (censo comuneros) ---
    const comunerosPorSector: Record<string, number> = {};
    comuneros.forEach((c) => {
      const s = c.sector || 'Sin sector';
      comunerosPorSector[s] = (comunerosPorSector[s] || 0) + 1;
    });

    // --- Edad ---
    const potencialPorEdad: Record<string, number> = {
      '18-20': 0,
      '21-25': 0,
      '26-30': 0,
      '31-35': 0,
      '>35': 0,
      sinDato: 0,
    };
    comuneros.forEach((c) => {
      const cv = cvByUser.get(c.id);
      const meta = (cv?.multimedia as any)?.profileMeta || {};
      const birth = this.parseBirthDate(meta.birthDate);
      if (!birth) {
        potencialPorEdad.sinDato++;
        return;
      }
      const band = this.ageBand(this.calcAge(birth));
      if (band) potencialPorEdad[band]++;
      else potencialPorEdad.sinDato++;
    });

    // --- Tipo mano de obra (ofertas / demanda) ---
    const manoObraRequerida: Record<string, number> = {};
    Object.keys(TIPO_MO_LABELS).forEach((k) => (manoObraRequerida[k] = 0));
    ofertasAll.forEach((o) => {
      manoObraRequerida[o.tipoManoObra] = (manoObraRequerida[o.tipoManoObra] || 0) + 1;
    });

    // Clasificación potencial local (heurística por specialty / mining years)
    const clasificacionTalento = {
      profesional: 0,
      tecnico: 0,
      calificado: 0,
      semiCalificado: 0,
      noCalificado: 0,
    };
    cvs.forEach((cv) => {
      const spec = String(cv.specialty || '').toLowerCase();
      const mining = Number(cv.yearsExperienceMining || 0);
      if (/ingenier|licen|profesional/.test(spec)) clasificacionTalento.profesional++;
      else if (/t[eé]cnic/.test(spec)) clasificacionTalento.tecnico++;
      else if (mining >= 3 || /operador|soldador|electri/.test(spec)) clasificacionTalento.calificado++;
      else if (mining >= 1 || /auxiliar|ayudante/.test(spec)) clasificacionTalento.semiCalificado++;
      else clasificacionTalento.noCalificado++;
    });

    // --- Trabajaron en mina por año (contratos + mining experience) ---
    const trabajaronMinaPorAnio: Record<string, number> = {};
    contratosAll.forEach((c) => {
      const y = new Date(c.createdAt).getFullYear();
      const sector = c.postulacion?.oferta?.sector || '';
      const isMina = /miner|antamina|tajo|huari|ancash/i.test(sector);
      const cv = cvByUser.get(c.userId);
      const hasMiningExp = Number(cv?.yearsExperienceMining || 0) > 0;
      if (isMina || hasMiningExp) {
        trabajaronMinaPorAnio[String(y)] = (trabajaronMinaPorAnio[String(y)] || 0) + 1;
      }
    });

    // --- Convocatorias por mes ---
    const convocatoriasPorMes = Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1,
      label: new Date(anio, i, 1).toLocaleString('es-PE', { month: 'short' }),
      total: 0,
    }));
    ofertasAnio.forEach((o) => {
      const m = new Date(o.createdAt).getMonth();
      convocatoriasPorMes[m].total++;
    });

    // --- Contratos por mes ---
    const contratosPorMes = Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1,
      label: new Date(anio, i, 1).toLocaleString('es-PE', { month: 'short' }),
      total: 0,
      activos: 0,
    }));
    contratosAnio.forEach((c) => {
      const m = new Date(c.createdAt).getMonth();
      contratosPorMes[m].total++;
      if (c.status === ContractStatus.ACTIVO) contratosPorMes[m].activos++;
    });

    // --- Contratos por tipo de mano de obra ---
    const contratosPorTipoMO: Record<string, number> = {};
    Object.keys(TIPO_MO_LABELS).forEach((k) => (contratosPorTipoMO[k] = 0));
    contratosAll.forEach((c) => {
      const tipo = c.postulacion?.oferta?.tipoManoObra;
      if (tipo) contratosPorTipoMO[tipo] = (contratosPorTipoMO[tipo] || 0) + 1;
    });

    const totalContratadosActivos = contratosAll.filter(
      (c) => c.status === ContractStatus.ACTIVO,
    ).length;
    const totalContratos = contratosAll.length;
    const contratosFinalizados = contratosAll.filter(
      (c) => c.status === ContractStatus.VENCIDO || c.status === ContractStatus.TERMINADO_PREMATURO,
    ).length;

    const rotacionLaboral =
      totalContratos > 0 ? (contratosFinalizados / totalContratos) * 100 : 0;
    const cumplimientoLocal =
      totalComuneros > 0 ? (totalContratadosActivos / totalComuneros) * 100 : 0;
    const participacionFemenina =
      totalComuneros > 0 ? (mujeres / totalComuneros) * 100 : 0;

    const empleoPorSector: Record<string, number> = {};
    contratosAll
      .filter((c) => c.status === ContractStatus.ACTIVO)
      .forEach((c) => {
        const sector = c.postulacion?.oferta?.sector || 'Sin Especificar';
        empleoPorSector[sector] = (empleoPorSector[sector] || 0) + 1;
      });

    const tenantsEnRojo = tenants.filter((t) => t.trustLevel === 'ROJO').length;
    const nivelConfianza =
      tenantsEnRojo > 0 ? 'CRÍTICO' : reclamosPendientes > 5 ? 'ADVERTENCIA' : 'ÓPTIMO';

    const alertas: Array<{ tipo: string; mensaje: string; color: string }> = [];
    if (tenantsEnRojo > 0) {
      alertas.push({
        tipo: 'Confianza',
        mensaje: `${tenantsEnRojo} entidades en nivel ROJO requieren intervención.`,
        color: 'red',
      });
    }
    if (reclamosPendientes > 0) {
      alertas.push({
        tipo: 'Mediación',
        mensaje: `${reclamosPendientes} reclamos pendientes de revisión.`,
        color: 'orange',
      });
    }
    if (cumplimientoLocal < 30) {
      alertas.push({
        tipo: 'Cuota Local',
        mensaje: `Cuota de empleo local (${cumplimientoLocal.toFixed(1)}%) bajo la meta.`,
        color: 'orange',
      });
    }

    const toLabeled = (map: Record<string, number>, labels?: Record<string, string>) =>
      Object.entries(map)
        .map(([key, value]) => ({
          key,
          label: labels?.[key] || key,
          value,
        }))
        .sort((a, b) => b.value - a.value);

    return {
      // compat con dashboard anterior
      totalContratados: totalContratadosActivos,
      totalContratos,
      rotacionLaboral: parseFloat(rotacionLaboral.toFixed(2)),
      cumplimientoLocal: parseFloat(cumplimientoLocal.toFixed(2)),
      totalComuneros,
      participacionFemenina: parseFloat(participacionFemenina.toFixed(2)),
      reclamosPendientes,
      distribucionGenero: {
        MASCULINO: varones,
        FEMENINO: mujeres,
        OTRO: otrosGenero,
      },
      empleoPorSector,
      pazSocial: {
        nivelConfianza,
        cumplimientoAcuerdos: Math.max(0, 100 - reclamosPendientes * 2),
        alertas,
      },
      tendencias: {
        contratados: `${totalContratadosActivos}`,
        cumplimiento: cumplimientoLocal >= 30 ? 'En meta' : 'Bajo meta',
        rotacion: `${rotacionLaboral.toFixed(1)}%`,
        femenina: `Meta: 40%`,
      },

      // --- Indicadores Ciro (5A) ---
      interesados: {
        total: totalComuneros,
        varones,
        mujeres,
        otros: otrosGenero,
      },
      comunerosPorSector: toLabeled(comunerosPorSector),
      potencialPorEdad: [
        ...AGE_BANDS.map((b) => ({
          key: b.key as string,
          label: b.key === '>35' ? 'Mayor a 35' : `${b.key} años`,
          value: potencialPorEdad[b.key],
        })),
        { key: 'sinDato', label: 'Sin fecha nac.', value: potencialPorEdad.sinDato },
      ],
      clasificacionTalento,
      manoObraRequerida: toLabeled(manoObraRequerida, TIPO_MO_LABELS),
      trabajaronMinaPorAnio: Object.entries(trabajaronMinaPorAnio)
        .map(([anioKey, value]) => ({ anio: Number(anioKey), value }))
        .sort((a, b) => a.anio - b.anio),
      convocatorias: {
        total: ofertasAll.length,
        vigentes: ofertasAll.filter((o) => o.status === OfertaStatus.VIGENTE).length,
        anio,
        porMes: convocatoriasPorMes,
      },
      contratos: {
        total: totalContratos,
        activos: totalContratadosActivos,
        anio,
        porMes: contratosPorMes,
        porTipoManoObra: toLabeled(contratosPorTipoMO, TIPO_MO_LABELS),
      },
      programaEntrenamiento: {
        participantes: participantesEntrenamiento.size,
        porEncuesta: encuestaEntrenamiento.length,
        porCursos: inscritosPrograma.length,
      },

      filtrosAplicados: {
        sector: filters.sector || null,
        gender: filters.gender || null,
        tipoManoObra: filters.tipoManoObra || null,
        anio,
        tenantId: filters.tenantId || null,
      },
      catalogoFiltros: {
        sectores: sectoresDisponibles.map((s) => s.sector).filter(Boolean) as string[],
        generos: Object.values(Gender),
        tiposManoObra: Object.entries(TIPO_MO_LABELS).map(([value, label]) => ({ value, label })),
        anios: [anio - 2, anio - 1, anio, anio + 1],
        empresas,
      },
      timestamp: new Date(),
    };
  }

  /** Compat: mantiene endpoint /dashboards */
  async getIndicadoresClave() {
    return this.getDashboardPersonalizado({});
  }

  async getBrechasCompetencias() {
    const ofertas = await this.prisma.oferta.findMany({
      where: { status: 'VIGENTE' },
      select: { requirements: true },
    });

    const skillsRequeridas = new Set<string>();
    ofertas.forEach((o) => {
      const reqs = o.requirements as any;
      if (reqs && Array.isArray(reqs.skills)) {
        reqs.skills.forEach((s: string) => skillsRequeridas.add(s.toLowerCase()));
      }
    });

    const habilidadesExistentes = await this.prisma.habilidad.findMany({
      select: { name: true },
    });

    const skillsDisponibles = new Set(habilidadesExistentes.map((h) => h.name.toLowerCase()));

    const brechas = Array.from(skillsRequeridas).filter((skill) => !skillsDisponibles.has(skill));

    return {
      totalSkillsRequeridas: skillsRequeridas.size,
      totalSkillsDisponibles: skillsDisponibles.size,
      brechasIdentificadas: brechas,
      recomendacion:
        brechas.length > 0
          ? `Se recomienda abrir programas de capacitación en: ${brechas.join(', ')}`
          : 'El talento local cubre las demandas actuales.',
    };
  }

  /** Catálogo de centros poblados georreferenciados */
  async getSectoresGeograficos() {
    return this.prisma.sectorGeografico.findMany({
      where: { activo: true, deletedAt: null },
      orderBy: { nombre: 'asc' },
    });
  }

  /**
   * Mapa de calor: agrega ofertas, comuneros y postulantes por centro poblado (lat/lng).
   */
  async getHeatmap(capa: HeatmapLayer = 'todos') {
    const sectores = await this.prisma.sectorGeografico.findMany({
      where: { activo: true, deletedAt: null },
    });

    const [ofertas, comuneros, postulaciones] = await Promise.all([
      this.prisma.oferta.findMany({
        where: { deletedAt: null },
        select: { id: true, sector: true, status: true, title: true, vacancies: true },
      }),
      this.prisma.user.findMany({
        where: { role: Role.COMUNERO, deletedAt: null },
        select: { id: true, sector: true, fullName: true },
      }),
      this.prisma.postulacion.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          user: { select: { sector: true } },
          oferta: { select: { sector: true } },
        },
      }),
    ]);

    const buckets = new Map<
      string,
      { sector: (typeof sectores)[0]; ofertas: number; comuneros: number; postulantes: number }
    >();

    for (const s of sectores) {
      buckets.set(s.id, { sector: s, ofertas: 0, comuneros: 0, postulantes: 0 });
    }

    const bump = (
      texto: string | null | undefined,
      field: 'ofertas' | 'comuneros' | 'postulantes',
      amount = 1,
    ) => {
      const match = matchSectorGeografico(texto, sectores);
      if (!match) return;
      const b = buckets.get(match.id);
      if (b) b[field] += amount;
    };

    for (const o of ofertas) bump(o.sector, 'ofertas');
    for (const c of comuneros) bump(c.sector, 'comuneros');
    for (const p of postulaciones) {
      // Preferimos ubicación del comunero; si no hay, la de la oferta
      bump(p.user?.sector || p.oferta?.sector, 'postulantes');
    }

    const pointsRaw: HeatmapPoint[] = Array.from(buckets.values()).map((b) => {
      const peso =
        capa === 'ofertas'
          ? b.ofertas
          : capa === 'comuneros'
            ? b.comuneros
            : capa === 'postulantes'
              ? b.postulantes
              : b.ofertas + b.comuneros + b.postulantes;

      return {
        sectorId: b.sector.id,
        codigo: b.sector.codigo,
        nombre: b.sector.nombre,
        lat: b.sector.latitud,
        lng: b.sector.longitud,
        peso,
        intensidad: 0,
        ofertas: b.ofertas,
        comuneros: b.comuneros,
        postulantes: b.postulantes,
      };
    });

    const maxPeso = Math.max(...pointsRaw.map((p) => p.peso), 1);
    const puntos = pointsRaw
      .map((p) => ({ ...p, intensidad: Number((p.peso / maxPeso).toFixed(3)) }))
      .sort((a, b) => b.peso - a.peso);

    const conDatos = puntos.filter((p) => p.peso > 0);
    const centerLat =
      conDatos.length > 0
        ? conDatos.reduce((s, p) => s + p.lat, 0) / conDatos.length
        : puntos.reduce((s, p) => s + p.lat, 0) / Math.max(puntos.length, 1);
    const centerLng =
      conDatos.length > 0
        ? conDatos.reduce((s, p) => s + p.lng, 0) / conDatos.length
        : puntos.reduce((s, p) => s + p.lng, 0) / Math.max(puntos.length, 1);

    return {
      capa,
      centro: { lat: centerLat || -9.53, lng: centerLng || -77.53 },
      zoom: 9,
      totales: {
        ofertas: ofertas.length,
        comuneros: comuneros.length,
        postulantes: postulaciones.length,
        sectoresConDato: conDatos.length,
      },
      puntos,
      timestamp: new Date(),
    };
  }
}
