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
        user: { select: { fullName: true, dni: true, trustLevel: true, sector: true } },
        habilidades: true,
      },
    });

    const sugerencias = cvs.map(cv => {
      const skillsComunero = cv.habilidades.map(h => h.name.toLowerCase());
      const coincidencias = skillsRequeridas.filter((s: string) => skillsComunero.includes(s));
      
      // Cálculo de score base por habilidades
      let score = (coincidencias.length / skillsRequeridas.length) * 70; // 70% peso habilidades

      // Bonus por experiencia (20% peso)
      const expRequerida = (requirements?.yearsExperience || 0);
      if (cv.yearsExperience.toNumber() >= expRequerida) {
        score += 20;
      } else if (cv.yearsExperience.toNumber() > 0) {
        score += (cv.yearsExperience.toNumber() / expRequerida) * 20;
      }

      // Bonus por sector (10% peso)
      if (cv.user.sector === oferta.sector) {
        score += 10;
      }

      // Bonus por TrustLevel (Multiplicador de confianza)
      let multiplier = 1.0;
      if (cv.user.trustLevel === 'VERDE') multiplier = 1.0;
      if (cv.user.trustLevel === 'AMARILLO') multiplier = 0.8;
      if (cv.user.trustLevel === 'ROJO') multiplier = 0.5;

      const finalScore = score * multiplier;

      return {
        userId: cv.userId,
        fullName: cv.user.fullName,
        trustLevel: cv.user.trustLevel,
        matchingScore: parseFloat(finalScore.toFixed(2)),
        skillsCoincidentes: coincidencias,
        experiencia: cv.yearsExperience,
        sector: cv.user.sector,
      };
    })
    .filter(s => s.matchingScore > 0)
    .sort((a, b) => b.matchingScore - a.matchingScore);

    return sugerencias;
  }
}
