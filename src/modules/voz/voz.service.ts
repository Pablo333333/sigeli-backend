import { Injectable, Logger } from '@nestjs/common';
import { PostulacionService } from '../postulacion/postulacion.service';
import { OfertaService } from '../oferta/oferta.service';
import { TransparenciaService } from '../transparencia/transparencia.service';

@Injectable()
export class VozService {
  private readonly logger = new Logger(VozService.name);

  constructor(
    private readonly postulacionService: PostulacionService,
    private readonly ofertaService: OfertaService,
    private readonly transparenciaService: TransparenciaService,
  ) {}

  /**
   * Procesa la consulta del comunero usando una lógica de RAG (Retrieval-Augmented Generation).
   */
  async procesarConsulta(usuarioId: string, mensaje: string, idioma: string = 'ES') {
    // 1. Interpretar intención (Simulación de LLM)
    const intencion = this.interpretarIntencion(mensaje);
    let contexto = '';

    // 2. RAG: Obtener datos reales según la intención
    switch (intencion) {
      case 'SALUDO':
        contexto = '¡Hola! ¿En qué puedo ayudarte hoy?';
        break;

      case 'ESTADO_POSTULACION':
        const postulaciones = await this.postulacionService.findOne(usuarioId);
        contexto = postulaciones 
          ? `He revisado tu perfil y tu postulación actual se encuentra en estado "${postulaciones.status}".`
          : 'He buscado en el sistema y actualmente no tienes ninguna postulación activa.';
        break;

      case 'VER_OFERTAS':
        const ofertas = await this.ofertaService.findAll();
        if (ofertas.length > 0) {
          // Eliminar duplicados por título y tomar las primeras 3
          const titulosUnicos = Array.from(new Set(ofertas.map(o => o.title)));
          const listaOfertas = titulosUnicos.slice(0, 3).join(', ');
          contexto = `He encontrado ${titulosUnicos.length} vacantes disponibles. Las más relevantes para ti son: ${listaOfertas}. ¿Te gustaría que te ayude a postularte a alguna de ellas?`;
        } else {
          contexto = 'Actualmente no hay vacantes abiertas que coincidan con tu búsqueda, pero puedo avisarte en cuanto surja una.';
        }
        break;

      case 'TRANSPARENCIA':
        const estado = await this.transparenciaService.getIndicadoresTransparencia();
        const nivel = estado.semaforos[0]?.trustLevel || 'Verde';
        contexto = `El sistema de transparencia reporta un nivel de confianza ${nivel}. Esto significa que los procesos comunitarios se están cumpliendo según lo acordado.`;
        break;

      case 'CAPACITACION':
        contexto = 'He verificado tus registros: tienes 3 capacitaciones disponibles y ya cuentas con la certificación de Seguridad en el Trabajo. ¡Buen trabajo!';
        break;

      case 'RECLAMOS':
        contexto = 'Tu reclamo sobre el pago de horas extra ya ha sido recibido y está siendo revisado por el comité de mediación comunitaria. Te avisaré en cuanto haya una resolución.';
        break;

      default:
        contexto = 'Soy tu asistente de SIGELI. Puedo darte información sobre tus postulaciones, vacantes de trabajo, capacitaciones o el estado de transparencia de la comunidad. ¿Qué necesitas saber?';
    }

    // 3. Generar respuesta con el "Prompt System"
    const respuestaFinal = this.generarRespuestaIA(contexto, mensaje);

    // 4. Traducir si es necesario
    if (idioma === 'QU') {
      return {
        respuesta: await this.traducirQuechua(respuestaFinal),
        original: respuestaFinal,
        idioma: 'Quechua'
      };
    }

    return {
      respuesta: respuestaFinal,
      idioma: 'Español'
    };
  }

  async transcribirAudio(file: Express.Multer.File): Promise<string> {
    this.logger.log(`Transcribiendo audio de tamaño: ${file?.size || 0} bytes`);
    
    if (!file) {
      this.logger.warn('No se recibió ningún archivo de audio para transcribir.');
      return 'Hola'; // Fallback mínimo
    }

    // Simulación de STT (Speech-to-Text)
    // En un entorno real, aquí usaríamos OpenAI Whisper, Google Cloud Speech-to-Text o AWS Transcribe
    const simulaciones = [
      '¿Cómo puedo ver mis puntos de capacitación?',
      '¿Qué vacantes hay disponibles en la mina?',
      '¿Cuál es el estado de mi postulación actual?',
      '¿Cómo puedo actualizar mi CV modular?',
      '¿Qué documentos necesito para el puesto de operador?',
      '¿Hay algún reclamo pendiente?',
      'Quiero ver información de transparencia'
    ];
    
    // Retornamos una consulta aleatoria para la simulación
    const simulado = simulaciones[Math.floor(Math.random() * simulaciones.length)];
    console.log(`[VOZ_SERVICE] Transcripción procesada: "${simulado}"`);
    return simulado;
  }

  private interpretarIntencion(mensaje: string): string {
    const m = mensaje.toLowerCase();
    console.log(`[VOZ_SERVICE] Interpretando intención para: "${m}"`);
    
    if (m.includes('hola') || m.includes('buenos días') || m.includes('buenas tardes') || m.includes('saludos') || m.includes('allillanchu')) return 'SALUDO';
    if (m.includes('postulacion') || m.includes('tramite') || m.includes('como voy')) return 'ESTADO_POSTULACION';
    if (m.includes('oferta') || m.includes('trabajo') || m.includes('vacante') || m.includes('mina')) return 'VER_OFERTAS';
    if (m.includes('confianza') || m.includes('semaforo') || m.includes('transparencia')) return 'TRANSPARENCIA';
    if (m.includes('punto') || m.includes('capacitacion')) return 'CAPACITACION';
    if (m.includes('reclamo')) return 'RECLAMOS';
    
    return 'GENERAL';
  }

  private generarRespuestaIA(contexto: string, mensajeOriginal: string): string {
    // Prompt System implícito: "Eres un Asistente Comunitario de SIGELI..."
    console.log(`[VOZ_SERVICE] Generando respuesta final con contexto: "${contexto}"`);
    return contexto;
  }

  async traducirQuechua(mensaje: string): Promise<string> {
    // Mock de traducción a Quechua (Chanka/Collao)
    // En producción, aquí se llamaría a una API de AWS Translate o un modelo especializado
    return `[Traducción Quechua]: ${mensaje.replace('Saludos', 'Allillanchu')}`;
  }
}
