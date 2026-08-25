import { ApplicationStatus } from '@prisma/client';

/**
 * Pipeline Antamina / SIGELI (Fase 3)
 * PRESENTACION_CV → SEGURIDAD → EVALUACION → ENTREVISTA → MEDICO → INDUCCION → CONTRATADO
 * RECHAZADO es terminal desde cualquier etapa previa.
 */
export const PIPELINE_ORDER: ApplicationStatus[] = [
  ApplicationStatus.PRESENTACION_CV,
  ApplicationStatus.SEGURIDAD,
  ApplicationStatus.EVALUACION,
  ApplicationStatus.ENTREVISTA,
  ApplicationStatus.MEDICO,
  ApplicationStatus.INDUCCION,
  ApplicationStatus.CONTRATADO,
];

export const STAGE_LABELS: Record<ApplicationStatus, string> = {
  PRESENTACION_CV: 'Presentación de CV',
  SEGURIDAD: 'Evaluación de seguridad (Antamina)',
  EVALUACION: 'Evaluación de CV por el empleador',
  ENTREVISTA: 'Entrevista de trabajo',
  MEDICO: 'Examen médico',
  INDUCCION: 'Inducción / capacitación para el trabajo',
  CONTRATADO: 'Subida al trabajo',
  RECHAZADO: 'Desestimado / rechazado',
};

/** Subestados permitidos por etapa (documento Ciro) */
export const STAGE_SUBSTATUSES: Partial<Record<ApplicationStatus, string[]>> = {
  PRESENTACION_CV: ['ENVIADO'],
  SEGURIDAD: ['APROBADO', 'OBSERVADO', 'REAPROBADO'],
  EVALUACION: ['APROBADO', 'OBSERVADO', 'RECHAZADO_EMPLEADOR'],
  ENTREVISTA: ['APROBADO', 'DESAPROBADO'],
  MEDICO: [
    'APROBADO_CON_OBSERVACION',
    'LEVANTA_OBSERVACION',
    'APROBADO_SIN_OBSERVACION',
    'DESAPROBADO',
  ],
  INDUCCION: ['APROBADO', 'DESAPROBADO'],
  CONTRATADO: ['SUBIDA_CONFIRMADA'],
  RECHAZADO: ['CERRADO'],
};

export const SUBSTATUS_LABELS: Record<string, string> = {
  ENVIADO: 'CV presentado',
  APROBADO: 'Aprobado',
  OBSERVADO: 'Observado',
  REAPROBADO: 'Reaprobado',
  RECHAZADO_EMPLEADOR: 'No continúa (empleador)',
  DESAPROBADO: 'Desaprobado',
  APROBADO_CON_OBSERVACION: 'Aprobado con observación',
  LEVANTA_OBSERVACION: 'Levanta observación',
  APROBADO_SIN_OBSERVACION: 'Aprobado sin observación',
  SUBIDA_CONFIRMADA: 'Subida al trabajo confirmada',
  CERRADO: 'Proceso cerrado',
};

export type TimelineEvent = {
  id: string;
  stage: ApplicationStatus;
  subStatus?: string;
  date: string;
  notes?: string;
  deadline?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  actorName?: string | null;
  meta?: {
    horasInduccion?: number;
    fechaSubida?: string;
    empleador?: string;
    [key: string]: unknown;
  };
};

export function createTimelineEvent(
  partial: Omit<TimelineEvent, 'id' | 'date'> & { date?: string; id?: string },
): TimelineEvent {
  return {
    id: partial.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    stage: partial.stage,
    subStatus: partial.subStatus,
    date: partial.date || new Date().toISOString(),
    notes: partial.notes,
    deadline: partial.deadline ?? null,
    actorId: partial.actorId ?? null,
    actorRole: partial.actorRole ?? null,
    actorName: partial.actorName ?? null,
    meta: partial.meta,
  };
}

/** Subestados que permiten avanzar a la siguiente etapa del pipeline */
export const ADVANCE_SUBSTATUSES: Partial<Record<ApplicationStatus, string[]>> = {
  PRESENTACION_CV: ['ENVIADO'],
  SEGURIDAD: ['APROBADO', 'REAPROBADO'],
  EVALUACION: ['APROBADO'],
  ENTREVISTA: ['APROBADO'],
  MEDICO: ['APROBADO_SIN_OBSERVACION', 'LEVANTA_OBSERVACION', 'APROBADO_CON_OBSERVACION'],
  INDUCCION: ['APROBADO'],
};

/** Subestados que fuerzan RECHAZADO */
export const REJECT_SUBSTATUSES = [
  'DESAPROBADO',
  'RECHAZADO_EMPLEADOR',
  'CERRADO',
];

export function getNextStage(current: ApplicationStatus): ApplicationStatus | null {
  const idx = PIPELINE_ORDER.indexOf(current);
  if (idx < 0 || idx >= PIPELINE_ORDER.length - 1) return null;
  return PIPELINE_ORDER[idx + 1];
}

export function buildVisualTimeline(
  currentStatus: ApplicationStatus,
  events: TimelineEvent[],
) {
  if (currentStatus === ApplicationStatus.RECHAZADO) {
    return PIPELINE_ORDER.map((stage) => {
      const related = events.filter((e) => e.stage === stage);
      const last = related[related.length - 1];
      return {
        stage,
        label: STAGE_LABELS[stage],
        state: related.length ? 'completed' : 'skipped',
        lastEvent: last || null,
      };
    }).concat([
      {
        stage: ApplicationStatus.RECHAZADO,
        label: STAGE_LABELS.RECHAZADO,
        state: 'rejected',
        lastEvent: events.filter((e) => e.stage === ApplicationStatus.RECHAZADO).pop() || null,
      },
    ]);
  }

  const currentIdx = PIPELINE_ORDER.indexOf(currentStatus);
  return PIPELINE_ORDER.map((stage, idx) => {
    const related = events.filter((e) => e.stage === stage);
    const last = related[related.length - 1];
    let state: 'completed' | 'current' | 'pending' = 'pending';
    if (idx < currentIdx) state = 'completed';
    else if (idx === currentIdx) state = 'current';
    return {
      stage,
      label: STAGE_LABELS[stage],
      state,
      lastEvent: last || null,
    };
  });
}
