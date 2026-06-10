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
      case 'ESTADO_POSTULACION':
        const postulaciones = await this.postulacionService.findOne(usuarioId); // Simplificado para el ejemplo
        contexto = `Tu postulación actual está en estado: ${postulaciones?.status || 'No tienes postulaciones activas'}.`;
        break;

      case 'VER_OFERTAS':
        const ofertas = await this.ofertaService.findAll();
        contexto = `Hay ${ofertas.length} ofertas abiertas. Las principales son: ${ofertas.map(o => o.title).join(', ')}.`;
        break;

      case 'TRANSPARENCIA':
        const estado = await this.transparenciaService.getIndicadoresTransparencia();
        contexto = `El semáforo de confianza actual es ${estado.semaforos[0]?.trustLevel || 'Verde'}.`;
        break;

      default:
        contexto = 'Soy tu asistente de SIGELI. Puedo ayudarte con tus postulaciones, ofertas laborales o información de transparencia.';
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

  private interpretarIntencion(mensaje: string): string {
    const m = mensaje.toLowerCase();
    if (m.includes('postulacion') || m.includes('tramite') || m.includes('como voy')) return 'ESTADO_POSTULACION';
    if (m.includes('oferta') || m.includes('trabajo') || m.includes('vacante')) return 'VER_OFERTAS';
    if (m.includes('confianza') || m.includes('semaforo') || m.includes('transparencia')) return 'TRANSPARENCIA';
    return 'GENERAL';
  }

  private generarRespuestaIA(contexto: string, mensajeOriginal: string): string {
    // Prompt System implícito: "Eres un Asistente Comunitario de SIGELI..."
    return `Rimaykullayki (Saludos). ${contexto} ¿Hay algo más en lo que pueda ayudarte con respeto y claridad?`;
  }

  async traducirQuechua(mensaje: string): Promise<string> {
    // Mock de traducción a Quechua (Chanka/Collao)
    // En producción, aquí se llamaría a una API de AWS Translate o un modelo especializado
    return `[Traducción Quechua]: ${mensaje.replace('Saludos', 'Allillanchu')}`;
  }
}
