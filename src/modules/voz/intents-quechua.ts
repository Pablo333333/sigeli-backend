/**
 * Base de intents bilingüe (Español / Quechua Ancashino-Collao) para el asistente Talento.
 * Respuestas plantilla; el servicio completa con datos reales cuando aplica.
 */

export type IntentId =
  | 'SALUDO'
  | 'ESTADO_POSTULACION'
  | 'VER_OFERTAS'
  | 'TRANSPARENCIA'
  | 'CAPACITACION'
  | 'RECLAMOS'
  | 'CONTRATO'
  | 'PUNTOS'
  | 'AYUDA'
  | 'DESPEDIDA'
  | 'GENERAL';

export type IntentDef = {
  id: IntentId;
  keywordsES: string[];
  keywordsQU: string[];
  /** Respuesta estática (sin datos dinámicos). Si hay builder, se usa como fallback. */
  respuestaES: string;
  respuestaQU: string;
};

export const INTENTS: IntentDef[] = [
  {
    id: 'SALUDO',
    keywordsES: ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'saludos', 'buen dia'],
    keywordsQU: ['allillanchu', 'rimaykullayki', 'imaynalla', 'napaykuy'],
    respuestaES: '¡Hola! Soy el asistente de Talento. Puedo ayudarte con postulaciones, ofertas, capacitaciones, transparencia y reclamos.',
    respuestaQU: 'Allillanchu. Ñuqaqa Talento yanapaqniyki kani. Postulacionkuna, llamkaykuna, yachachiykuna, transparencia hinaspa reclamokunamanta willaykusqayki.',
  },
  {
    id: 'ESTADO_POSTULACION',
    keywordsES: [
      'postulacion',
      'postulación',
      'tramite',
      'trámite',
      'como voy',
      'cómo voy',
      'mi proceso',
      'estado de mi',
      'seguimiento',
    ],
    keywordsQU: ['postulacion', 'trami', 'imaynataq', 'imayna kay', 'seguimiento'],
    respuestaES: 'Revisaré el estado de tus postulaciones.',
    respuestaQU: 'Postulacionniykikunapa kayninta qhawasaq.',
  },
  {
    id: 'VER_OFERTAS',
    keywordsES: [
      'oferta',
      'trabajo',
      'vacante',
      'empleo',
      'mina',
      'convocatoria',
      'puesto',
      'hay trabajo',
    ],
    keywordsQU: ['llamkay', 'oferta', 'vacante', 'mina', 'imataq kan', 'llankay'],
    respuestaES: 'Buscaré las ofertas laborales vigentes.',
    respuestaQU: 'Kunan llamkay ofertakunata maskasaq.',
  },
  {
    id: 'TRANSPARENCIA',
    keywordsES: ['confianza', 'semaforo', 'semáforo', 'transparencia', 'acuerdo', 'paz social'],
    keywordsQU: ['confianza', 'semaforo', 'transparencia', 'acuerdo', 'thak'],
    respuestaES: 'Consultaré el semáforo de confianza y transparencia comunal.',
    respuestaQU: 'Comunidadpa confianza semaforonmanta willasayki.',
  },
  {
    id: 'CAPACITACION',
    keywordsES: ['capacitacion', 'capacitación', 'curso', 'entrenamiento', 'certificado', 'aprender'],
    keywordsQU: ['yachachiy', 'capacitacion', 'curso', 'certificado', 'yachay'],
    respuestaES: 'Revisaré tus capacitaciones y certificaciones.',
    respuestaQU: 'Yachachikuyniykikunata qhawasaq.',
  },
  {
    id: 'RECLAMOS',
    keywordsES: ['reclamo', 'queja', 'denuncia', 'problema laboral', 'pago'],
    keywordsQU: ['reclamo', 'queja', 'problema', 'manam allinchu'],
    respuestaES: 'Puedes registrar un reclamo desde la sección Reclamos. Te indico cómo va el canal de mediación.',
    respuestaQU: 'Reclamo ruranaykipaq Reclamos nisqapi yaykuy. Mediacion comiteqa yanapasunki.',
  },
  {
    id: 'CONTRATO',
    keywordsES: ['contrato', 'firma', 'regimen', 'régimen', 'sueldo', 'salario'],
    keywordsQU: ['contrato', 'firma', 'regimen', 'sueldo'],
    respuestaES:
      'Los contratos se formalizan cuando tu postulación llega a CONTRATADO, con validación facial. Revisa Seguimiento para ver el avance.',
    respuestaQU:
      'Postulacionniyki CONTRATADO kaptinmi contrato ruwakun, uyariywan. Seguimiento nisqapi qhaway.',
  },
  {
    id: 'PUNTOS',
    keywordsES: ['punto', 'puntos', 'gamificacion', 'gamificación', 'premio'],
    keywordsQU: ['punto', 'puntos', 'premio'],
    respuestaES: 'Tus puntos se acumulan al certificar capacitaciones y completar actividades en Talento.',
    respuestaQU: 'Yachachiypi certificado horqoptikiqa puntokuna yapakun Talentopi.',
  },
  {
    id: 'AYUDA',
    keywordsES: ['ayuda', 'que puedes', 'qué puedes', 'opciones', 'menu', 'menú', 'como funciona'],
    keywordsQU: ['yanapay', 'ima', 'imayna', 'ayuda'],
    respuestaES:
      'Puedo ayudarte con: 1) estado de postulación, 2) ofertas de trabajo, 3) capacitaciones, 4) transparencia, 5) reclamos, 6) contratos y puntos. Escribe o habla tu consulta.',
    respuestaQU:
      'Yanapasayki: 1) postulacion kaynin, 2) llamkay ofertas, 3) yachachiy, 4) transparencia, 5) reclamos, 6) contrato hinaspa puntos. Qillqay utaq rimay.',
  },
  {
    id: 'DESPEDIDA',
    keywordsES: ['gracias', 'chau', 'adios', 'adiós', 'hasta luego', 'nos vemos'],
    keywordsQU: ['gracias', 'añay', 'riqsikuyki', 'tukuchani', 'hasta luego'],
    respuestaES: '¡Con gusto! Cuando necesites, aquí estaré. ¡Éxitos!',
    respuestaQU: 'Añayki. Necesitaspaqa kaypi kasaq. Allinllam kachun.',
  },
  {
    id: 'GENERAL',
    keywordsES: [],
    keywordsQU: [],
    respuestaES:
      'Soy el asistente de Talento. Pregúntame por tus postulaciones, ofertas, capacitaciones, transparencia o reclamos. También puedes cambiar a Quechua arriba.',
    respuestaQU:
      'Ñuqaqa Talento yanapaqniyki kani. Postulacion, llamkay, yachachiy, transparencia utaq reclamomanta tapuway. Hanaypi Quechuaman tikrayta atinki.',
  },
];

export function normalizeText(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectarIntent(mensaje: string, idioma: 'ES' | 'QU' = 'ES'): IntentId {
  const m = normalizeText(mensaje);
  let best: { id: IntentId; score: number } = { id: 'GENERAL', score: 0 };

  for (const intent of INTENTS) {
    if (intent.id === 'GENERAL') continue;
    const keys = [...intent.keywordsES, ...intent.keywordsQU];
    let score = 0;
    for (const k of keys) {
      const nk = normalizeText(k);
      if (!nk) continue;
      if (m === nk) score += 3;
      else if (m.includes(nk)) score += 2;
    }
    // Bonus leve si el idioma activo coincide con keywords del mismo idioma
    const langKeys = idioma === 'QU' ? intent.keywordsQU : intent.keywordsES;
    for (const k of langKeys) {
      if (m.includes(normalizeText(k))) score += 1;
    }
    if (score > best.score) best = { id: intent.id, score };
  }

  return best.id;
}

export function respuestaEstatica(intentId: IntentId, idioma: 'ES' | 'QU'): string {
  const intent = INTENTS.find((i) => i.id === intentId) || INTENTS.find((i) => i.id === 'GENERAL')!;
  return idioma === 'QU' ? intent.respuestaQU : intent.respuestaES;
}

/** Frases de ejemplo para STT simulado según idioma */
export const FRASES_STT_ES = [
  'Hola, ¿cómo estás?',
  '¿Cuál es el estado de mi postulación?',
  '¿Qué ofertas de trabajo hay en la mina?',
  'Quiero ver capacitaciones disponibles',
  '¿Cómo está la transparencia de la comunidad?',
  'Necesito ayuda con un reclamo',
  '¿Cuántos puntos tengo?',
];

export const FRASES_STT_QU = [
  'Allillanchu',
  'Imaynataq postulacionniy?',
  'Ima llamkay ofertakuna kan?',
  'Yachachikuymanta willaway',
  'Transparenciamanta willaway',
  'Yanapay reclamo ruranaypaq',
  'Añay, tukuchani',
];
