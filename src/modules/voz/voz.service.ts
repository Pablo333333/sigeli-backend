import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OfertaStatus, Role } from '@prisma/client';
import {
  detectarIntent,
  FRASES_STT_ES,
  FRASES_STT_QU,
  IntentId,
  respuestaEstatica,
} from './intents-quechua';

@Injectable()
export class VozService {
  private readonly logger = new Logger(VozService.name);

  constructor(private readonly prisma: PrismaService) {}

  async procesarConsulta(usuarioId: string, mensaje: string, idiomaRaw: string = 'ES') {
    const idioma: 'ES' | 'QU' = idiomaRaw?.toUpperCase() === 'QU' ? 'QU' : 'ES';
    const intent = detectarIntent(mensaje, idioma);
    this.logger.log(`Intent=${intent} idioma=${idioma} msg="${mensaje.slice(0, 80)}"`);

    const respuesta = await this.construirRespuesta(intent, usuarioId, idioma);

    return {
      respuesta,
      original: mensaje,
      intent,
      idioma: idioma === 'QU' ? 'Quechua' : 'Español',
      idiomaCodigo: idioma,
    };
  }

  /**
   * STT local consolidado: sin API externa.
   * Usa tamaño/offset del audio para elegir frase estable (no aleatoria pura)
   * y frases reales ES/QU alineadas a la base de intents.
   */
  async transcribirAudio(
    file: Express.Multer.File | undefined,
    idiomaRaw: string = 'ES',
  ): Promise<string> {
    const idioma: 'ES' | 'QU' = idiomaRaw?.toUpperCase() === 'QU' ? 'QU' : 'ES';
    const frases = idioma === 'QU' ? FRASES_STT_QU : FRASES_STT_ES;

    if (!file?.buffer?.length && !file?.size) {
      this.logger.warn('Audio vacío; usando saludo por defecto');
      return frases[0];
    }

    const size = file.buffer?.length || file.size || 0;
    const idx = size % frases.length;
    const texto = frases[idx];
    this.logger.log(`STT simulado (${idioma}): "${texto}" size=${size}`);
    return texto;
  }

  private async construirRespuesta(
    intent: IntentId,
    usuarioId: string,
    idioma: 'ES' | 'QU',
  ): Promise<string> {
    switch (intent) {
      case 'SALUDO':
      case 'AYUDA':
      case 'DESPEDIDA':
      case 'CONTRATO':
      case 'GENERAL':
        return respuestaEstatica(intent, idioma);

      case 'ESTADO_POSTULACION':
        return this.respuestaPostulaciones(usuarioId, idioma);

      case 'VER_OFERTAS':
        return this.respuestaOfertas(idioma);

      case 'TRANSPARENCIA':
        return this.respuestaTransparencia(idioma);

      case 'CAPACITACION':
        return this.respuestaCapacitaciones(usuarioId, idioma);

      case 'RECLAMOS':
        return this.respuestaReclamos(usuarioId, idioma);

      case 'PUNTOS':
        return this.respuestaPuntos(usuarioId, idioma);

      default:
        return respuestaEstatica('GENERAL', idioma);
    }
  }

  private async respuestaPostulaciones(usuarioId: string, idioma: 'ES' | 'QU') {
    const list = await this.prisma.postulacion.findMany({
      where: { userId: usuarioId, deletedAt: null },
      include: { oferta: { select: { title: true, companyName: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    if (!list.length) {
      return idioma === 'QU'
        ? 'Kunanqa manam postulacionniyki kanchu. Ofertakunata qhawaspa postulay.'
        : 'No tienes postulaciones activas. Revisa Ofertas y postúlate a una vacante.';
    }

    const lineas = list.map((p) => {
      const puesto = p.oferta?.title || 'Puesto';
      const emp = p.oferta?.companyName ? ` (${p.oferta.companyName})` : '';
      return idioma === 'QU'
        ? `• ${puesto}${emp}: estado ${p.status}`
        : `• ${puesto}${emp}: estado ${p.status}`;
    });

    return idioma === 'QU'
      ? `Postulacionniykikuna:\n${lineas.join('\n')}`
      : `Tus postulaciones:\n${lineas.join('\n')}`;
  }

  private async respuestaOfertas(idioma: 'ES' | 'QU') {
    const ofertas = await this.prisma.oferta.findMany({
      where: { status: OfertaStatus.VIGENTE, deletedAt: null },
      select: { title: true, companyName: true, sector: true, salary: true },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    if (!ofertas.length) {
      return idioma === 'QU'
        ? 'Kunanqa manam llamkay oferta kanchu. Musuq kaqtin willasayki.'
        : 'No hay ofertas vigentes por ahora. Te avisaremos cuando se publiquen nuevas.';
    }

    const lineas = ofertas.map((o) => {
      const emp = o.companyName || 'Empresa';
      return `• ${o.title} — ${emp} (${o.sector})`;
    });

    return idioma === 'QU'
      ? `${ofertas.length} llamkay oferta kan:\n${lineas.join('\n')}`
      : `Hay ${ofertas.length} oferta(s) vigente(s):\n${lineas.join('\n')}`;
  }

  private async respuestaTransparencia(idioma: 'ES' | 'QU') {
    const tenant = await this.prisma.tenant.findFirst({
      where: { type: 'COMUNIDAD', deletedAt: null },
      select: { name: true, trustLevel: true },
    });
    const nivel = tenant?.trustLevel || 'VERDE';
    const nombre = tenant?.name || 'la comunidad';

    return idioma === 'QU'
      ? `${nombre} comunidadpa confianza semaforon: ${nivel}. Acuerdokuna qatiyninmi kaypi rikukun.`
      : `El semáforo de confianza de ${nombre} está en nivel ${nivel}. Puedes ver más detalle en Transparencia.`;
  }

  private async respuestaCapacitaciones(usuarioId: string, idioma: 'ES' | 'QU') {
    const regs = await this.prisma.capacitacionUsuario.findMany({
      where: { userId: usuarioId },
      include: { capacitacion: { select: { title: true } } },
      take: 5,
    });

    if (!regs.length) {
      return idioma === 'QU'
        ? 'Manaraqmi yachachikuymanmi qillqakunkichu. Capacitaciones nisqapi qhaway.'
        : 'Aún no estás inscrito en capacitaciones. Revisa la sección Capacitaciones.';
    }

    const cert = regs.filter((r) => r.isCertified).length;
    const lineas = regs.map(
      (r) =>
        `• ${r.capacitacion.title}: ${r.progress}%${r.isCertified ? (idioma === 'QU' ? ' (certificado)' : ' (certificado)') : ''}`,
    );

    return idioma === 'QU'
      ? `${regs.length} yachachikuyniyki kan (${cert} certificado):\n${lineas.join('\n')}`
      : `Tienes ${regs.length} capacitación(es) (${cert} certificada(s)):\n${lineas.join('\n')}`;
  }

  private async respuestaReclamos(usuarioId: string, idioma: 'ES' | 'QU') {
    const reclamos = await this.prisma.reclamo.findMany({
      where: { userId: usuarioId },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    if (!reclamos.length) {
      return idioma === 'QU'
        ? 'Manam reclamo kanchu. Musuqta rurayta munanki chayqa Reclamos nisqapi yaykuy.'
        : 'No tienes reclamos registrados. Si necesitas presentar uno, ve a la sección Reclamos.';
    }

    const lineas = reclamos.map((r) => `• ${(r.motivo || 'Reclamo').slice(0, 60)}: ${r.estado || 'PENDIENTE'}`);
    return idioma === 'QU'
      ? `Reclamoykikuna:\n${lineas.join('\n')}`
      : `Tus reclamos:\n${lineas.join('\n')}`;
  }

  private async respuestaPuntos(usuarioId: string, idioma: 'ES' | 'QU') {
    const user = await this.prisma.user.findUnique({
      where: { id: usuarioId },
      select: { points: true, fullName: true, role: true },
    });

    if (!user || user.role === Role.DIRECTIVA) {
      return idioma === 'QU'
        ? 'Directiva rolyuqkaqqa manam puntokunata huñunchu. Monitoreollam ruwan.'
        : 'Tu rol no acumula puntos de gamificación. Puedes monitorear el sistema desde el panel.';
    }

    const pts = user.points ?? 0;
    return idioma === 'QU'
      ? `${user.fullName}, kunan ${pts} puntoyuq kanki. Yachachiypi certificado horqospa yapanki.`
      : `${user.fullName}, tienes ${pts} puntos. Certifica capacitaciones para sumar más.`;
  }
}
