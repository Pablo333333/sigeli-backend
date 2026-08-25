import { SectorGeografico } from '@prisma/client';

export type HeatmapLayer = 'ofertas' | 'comuneros' | 'postulantes' | 'todos';

export type HeatmapPoint = {
  sectorId: string;
  codigo: string;
  nombre: string;
  lat: number;
  lng: number;
  peso: number;
  intensidad: number;
  ofertas: number;
  comuneros: number;
  postulantes: number;
};

/**
 * Empareja un texto libre (User.sector / Oferta.sector) con un centro poblado georreferenciado.
 */
export function matchSectorGeografico(
  texto: string | null | undefined,
  sectores: SectorGeografico[],
): SectorGeografico | null {
  if (!texto?.trim()) return null;
  const t = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  // 1) Nombre exacto o alias exacto
  for (const s of sectores) {
    const nombre = normalize(s.nombre);
    if (nombre === t) return s;
    for (const a of s.aliases || []) {
      if (normalize(a) === t) return s;
    }
  }

  // 2) Contiene nombre/alias (ej. "Minería / Huari", "Logística / Huarmey")
  let best: { sector: SectorGeografico; score: number } | null = null;
  for (const s of sectores) {
    const candidates = [s.nombre, ...(s.aliases || [])].map(normalize);
    for (const c of candidates) {
      if (!c) continue;
      if (t.includes(c) || c.includes(t)) {
        const score = c.length;
        if (!best || score > best.score) best = { sector: s, score };
      }
    }
  }
  return best?.sector || null;
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}
