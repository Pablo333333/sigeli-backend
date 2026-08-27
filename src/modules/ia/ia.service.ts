import { Injectable } from '@nestjs/common';

@Injectable()
export class IAService {
  async generarResumen(especialidad: string, experiencia: number) {
    // Simulación de IA para la demo
    const plantillas = [
      `Profesional altamente calificado en el sector de ${especialidad}, con una sólida trayectoria de ${experiencia} años respaldada por la comunidad. Especializado en procesos críticos y mantenimiento, con un perfil óptimo verificado para el desarrollo local.`,
      `Experto en ${especialidad} con ${experiencia} años de experiencia comprobada. Destaca por su compromiso con la excelencia operativa y la seguridad. Perfil integral con capacidades técnicas avanzadas para proyectos de gran envergadura.`,
      `Especialista en ${especialidad} con una carrera de ${experiencia} años. Posee un historial destacado de eficiencia y adaptabilidad en entornos exigentes. Su perfil representa el talento local de alta competencia que Talento promueve.`
    ];

    // Seleccionar una plantilla al azar para que no sea siempre igual
    const index = Math.floor(Math.random() * plantillas.length);
    
    // Simular un pequeño retraso de red/procesamiento de IA
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      resumen: plantillas[index]
    };
  }

  async analizarSentimiento(texto: string) {
    // Simulación de análisis de sentimiento con IA
    const palabrasPositivas = ['excelente', 'bueno', 'gran', 'cumple', 'responsable', 'puntual'];
    const palabrasNegativas = ['malo', 'tarde', 'incumple', 'problema', 'conflicto', 'queja'];

    const textoLower = texto.toLowerCase();
    let score = 0.5; // Neutro por defecto

    palabrasPositivas.forEach(p => {
      if (textoLower.includes(p)) score += 0.1;
    });

    palabrasNegativas.forEach(p => {
      if (textoLower.includes(p)) score -= 0.1;
    });

    // Normalizar score entre 0 y 1
    score = Math.max(0, Math.min(1, score));

    let sentimiento = 'NEUTRO';
    if (score > 0.6) sentimiento = 'POSITIVO';
    if (score < 0.4) sentimiento = 'NEGATIVO';

    return {
      score: parseFloat(score.toFixed(2)),
      sentimiento,
      emociones: score > 0.6 ? ['Satisfacción', 'Confianza'] : score < 0.4 ? ['Preocupación', 'Frustración'] : ['Neutralidad'],
      timestamp: new Date()
    };
  }
}
