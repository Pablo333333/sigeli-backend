import { 
  Injectable, 
  NotFoundException, 
  InternalServerErrorException,
  UseInterceptors 
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CryptoService } from '../../common/services/crypto.service';
import { CreateCVDto } from './dto/create-cv.dto';
import { UpdateExperienciaDto } from './dto/update-experiencia.dto';
import { UpdateEducacionDto } from './dto/update-educacion.dto';
import { UpdateHabilidadesDto } from './dto/update-habilidades.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Prisma, ExperienciaCategoria } from '@prisma/client';

@Injectable()
@UseInterceptors(AuditInterceptor)
export class CVService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  async createOrUpdateCV(dto: CreateCVDto) {
    const { userId, ...cvData } = dto;

    try {
      const userExists = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!userExists) {
        throw new NotFoundException(`El usuario con ID ${userId} no existe.`);
      }

      const cv = await this.prisma.cV.upsert({
        where: { userId },
        update: {
          aiSummary: cvData.aiSummary,
          multimedia: cvData.multimedia as Prisma.JsonObject,
          blockchainHash: cvData.blockchainHash,
          updatedAt: new Date(),
        },
        create: {
          userId,
          aiSummary: cvData.aiSummary,
          yearsExperience: new Prisma.Decimal(0),
          yearsExperienceMining: new Prisma.Decimal(0),
          yearsExperienceGeneral: new Prisma.Decimal(0),
          multimedia: cvData.multimedia as Prisma.JsonObject,
          blockchainHash: cvData.blockchainHash,
        },
      });

      await this.recalculateYearsExperience(cv.id);

      return this.findByUserId(userId);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(`Error al procesar el CV: ${error.message}`);
    }
  }

  async updateExperiencia(userId: string, dto: UpdateExperienciaDto) {
    const cv = await this.prisma.cV.findUnique({ where: { userId } });
    if (!cv) throw new NotFoundException('CV no encontrado');

    if (dto.id) {
      await this.prisma.experienciaLaboral.update({
        where: { id: dto.id },
        data: {
          company: dto.company,
          position: dto.position,
          categoria: dto.categoria,
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        },
      });
    } else {
      await this.prisma.experienciaLaboral.create({
        data: {
          cvId: cv.id,
          company: dto.company,
          position: dto.position,
          categoria: dto.categoria,
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        },
      });
    }

    await this.recalculateYearsExperience(cv.id);
    return this.findByUserId(userId);
  }

  async updateEducacion(userId: string, dto: UpdateEducacionDto) {
    const cv = await this.prisma.cV.findUnique({ where: { userId } });
    if (!cv) throw new NotFoundException('CV no encontrado');

    if (dto.id) {
      await this.prisma.educacion.update({
        where: { id: dto.id },
        data: {
          institucion: dto.institucion,
          titulo: dto.titulo,
          tipoEstudio: dto.tipoEstudio,
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        },
      });
    } else {
      await this.prisma.educacion.create({
        data: {
          cvId: cv.id,
          institucion: dto.institucion,
          titulo: dto.titulo,
          tipoEstudio: dto.tipoEstudio,
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        },
      });
    }

    return this.findByUserId(userId);
  }

  async updateHabilidades(userId: string, dto: UpdateHabilidadesDto) {
    const cv = await this.prisma.cV.findUnique({ where: { userId } });
    if (!cv) throw new NotFoundException('CV no encontrado');

    await this.prisma.habilidad.deleteMany({ where: { cvId: cv.id } });
    
    await this.prisma.habilidad.createMany({
      data: dto.names.map(name => ({
        cvId: cv.id,
        name,
        isVerified: false,
      })),
    });

    return this.findByUserId(userId);
  }

  async recalculateYearsExperience(cvId: string) {
    const experiencias = await this.prisma.experienciaLaboral.findMany({
      where: { cvId, deletedAt: null },
    });

    let totalMiningDays = 0;
    let totalGeneralDays = 0;

    experiencias.forEach(exp => {
      const start = new Date(exp.startDate);
      const end = exp.endDate ? new Date(exp.endDate) : new Date();
      const diff = end.getTime() - start.getTime();
      const days = diff / (1000 * 3600 * 24);

      if (exp.categoria === ExperienciaCategoria.MINERIA) {
        totalMiningDays += days;
      } else {
        totalGeneralDays += days;
      }
    });

    const yearsMining = new Prisma.Decimal(totalMiningDays / 365.25);
    const yearsGeneral = new Prisma.Decimal(totalGeneralDays / 365.25);
    const yearsTotal = new Prisma.Decimal((totalMiningDays + totalGeneralDays) / 365.25);

    await this.prisma.cV.update({
      where: { id: cvId },
      data: { 
        yearsExperience: yearsTotal,
        yearsExperienceMining: yearsMining,
        yearsExperienceGeneral: yearsGeneral,
      },
    });
  }

  async findByUserId(userId: string) {
    const cv = await this.prisma.cV.findUnique({
      where: { userId },
      include: {
        experiencias: {
          where: { deletedAt: null },
          orderBy: { startDate: 'desc' },
        },
        educaciones: {
          where: { deletedAt: null },
          orderBy: { startDate: 'desc' },
        },
        habilidades: true,
        user: {
          select: {
            fullName: true,
            dni: true,
            trustLevel: true,
          }
        }
      },
    });

    if (!cv) {
      throw new NotFoundException(`No se encontró CV para el usuario con ID ${userId}`);
    }

    return this.decryptCV(cv);
  }

  private decryptCV(cv: any) {
    if (cv.user) {
      cv.user.email = cv.user.email ? this.cryptoService.decrypt(cv.user.email) : null;
      cv.user.phone = cv.user.phone ? this.cryptoService.decrypt(cv.user.phone) : null;
    }
    return cv;
  }
}
