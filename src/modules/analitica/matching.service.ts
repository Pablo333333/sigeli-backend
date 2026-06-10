import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sugiere candidatos para una oferta basándose en el matching de habilidades.
   */
  async sugerirCandidatos(ofertaId: string) {
    const oferta = await this.prisma.oferta.findUnique({
      where: { id: ofertaId },
    });

    if (!oferta) throw new NotFoundException('Oferta no encontrada');

    const requirements = oferta.requirements as any;
    const skillsRequeridas = (requirements?.skills || []).map((s: string) => s.toLowerCase());

    if (skillsRequeridas.length === 0) {
      return { message: 'La oferta no tiene habilidades específicas requeridas.' };
    }

    // Buscamos CVs que tengan al menos una de las habilidades requeridas
    const cvs = await this.prisma.cV.findMany({
      include: {
        user: { select: { fullName: true, dni: true, trustLevel: true } },
        habilidades: true,
      },
    });

    const sugerencias = cvs.map(cv => {
      const skillsComunero = cv.habilidades.map(h => h.name.toLowerCase());
      const coincidencias = skillsRequeridas.filter((s: string) => skillsComunero.includes(s));
      
      const score = (coincidencias.length / skillsRequeridas.size) * 100;

      return {
        userId: cv.userId,
        fullName: cv.user.fullName,
        trustLevel: cv.user.trustLevel,
        matchingScore: parseFloat(score.toFixed(2)),
        skillsCoincidentes: coincidencias,
      };
    })
    .filter(s => s.matchingScore > 0)
    .sort((a, b) => b.matchingScore - a.matchingScore);

    return sugerencias;
  }
}
