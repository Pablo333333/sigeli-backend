import { 
  Injectable, 
  NotFoundException, 
  InternalServerErrorException,
  BadRequestException,
  ConflictException,
  UseInterceptors 
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CryptoService } from '../../common/services/crypto.service';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { CreateCVDto } from './dto/create-cv.dto';
import { UpdateExperienciaDto } from './dto/update-experiencia.dto';
import { UpdateEducacionDto } from './dto/update-educacion.dto';
import { UpdateHabilidadesDto } from './dto/update-habilidades.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Prisma, ExperienciaCategoria } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const DEFAULT_COMUNERO_PASSWORD = 'Password123!';

@Injectable()
@UseInterceptors(AuditInterceptor)
export class CVService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /** Normaliza DNI a 8 dígitos o lanza BadRequest. */
  private normalizeDni(raw?: string | null): string | null {
    if (raw == null || String(raw).trim() === '') return null;
    const digits = String(raw).replace(/\D/g, '');
    if (digits.length !== 8) {
      throw new BadRequestException(
        'El DNI debe tener exactamente 8 dígitos numéricos.',
      );
    }
    return digits;
  }

  /**
   * Verifica si un DNI ya está registrado (anti-duplicados).
   * excludeUserId: al editar el propio perfil, no contar el mismo usuario.
   */
  async checkDniDisponible(dniRaw: string, excludeUserId?: string) {
    const dni = this.normalizeDni(dniRaw);
    if (!dni) {
      throw new BadRequestException('Debe indicar un DNI válido de 8 dígitos.');
    }
    const existing = await this.prisma.user.findFirst({
      where: {
        dni,
        deletedAt: null,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true, fullName: true, dni: true, role: true },
    });
    if (existing) {
      return {
        disponible: false,
        mensaje: `Ya existe un registro con el DNI ${dni} (${existing.fullName}). No se permiten duplicados.`,
        existente: { fullName: existing.fullName, role: existing.role },
      };
    }
    return { disponible: true, mensaje: `El DNI ${dni} está disponible.`, existente: null };
  }

  async createOrUpdateCV(dto: CreateCVDto, files?: {
    profilePhoto?: Express.Multer.File[],
    coverPhoto?: Express.Multer.File[],
    dniFront?: Express.Multer.File[],
    dniBack?: Express.Multer.File[],
    presentationVideo?: Express.Multer.File[],
  }) {
    let { userId, ...cvData } = dto;

    try {
      // Validar edad ≥ 18 si viene birthDate (DDMMYYYY o ISO)
      if (cvData.birthDate) {
        const age = this.calcularEdad(String(cvData.birthDate));
        if (age !== null && age < 18) {
          throw new BadRequestException(
            'Solo se puede registrar el CV si el comunero tiene 18 años o más.',
          );
        }
      }

      const normalizedDni = this.normalizeDni(cvData.dni);
      if (normalizedDni) {
        cvData.dni = normalizedDni;
      }

      // Anti-duplicado DNI
      if (normalizedDni) {
        if (!userId) {
          // Registro nuevo (admin / alta): DNI no puede existir
          const clash = await this.prisma.user.findFirst({
            where: { dni: normalizedDni, deletedAt: null },
            select: { id: true, fullName: true },
          });
          if (clash) {
            throw new ConflictException(
              `Ya existe un comunero registrado con el DNI ${normalizedDni} (${clash.fullName}). No se permiten duplicados. Busque el perfil existente o use otro DNI.`,
            );
          }
        } else {
          // Actualización: el DNI no puede pertenecer a otro usuario
          const clash = await this.prisma.user.findFirst({
            where: {
              dni: normalizedDni,
              deletedAt: null,
              id: { not: userId },
            },
            select: { id: true, fullName: true },
          });
          if (clash) {
            throw new ConflictException(
              `El DNI ${normalizedDni} ya pertenece a otro registro (${clash.fullName}). No se permiten duplicados.`,
            );
          }
        }
      }

      // 2. Si no hay userId, creamos un nuevo usuario con rol COMUNERO
      if (!userId) {
        if (!normalizedDni) {
          throw new BadRequestException(
            'Para registrar un nuevo comunero debe indicar un DNI de 8 dígitos.',
          );
        }

        let tenant = await this.prisma.tenant.findFirst({
          where: { type: 'COMUNIDAD' }
        });

        if (!tenant) {
          tenant = await this.prisma.tenant.create({
            data: {
              name: cvData.sector || 'Comunidad General',
              type: 'COMUNIDAD'
            }
          });
        }

        const defaultEmail = `${normalizedDni}@sigeli.com`;
        const emailClash = await this.prisma.user.findFirst({
          where: { email: defaultEmail, deletedAt: null },
        });
        if (emailClash) {
          throw new ConflictException(
            `Ya existe un usuario asociado al DNI ${normalizedDni}. No se permiten duplicados.`,
          );
        }

        const hashedPassword = await bcrypt.hash(DEFAULT_COMUNERO_PASSWORD, 10);

        const newUser = await this.prisma.user.create({
          data: {
            fullName: cvData.fullName || 'Nuevo Comunero',
            dni: normalizedDni,
            email: defaultEmail,
            sector: cvData.sector,
            role: 'COMUNERO',
            password: hashedPassword,
            tenantId: tenant.id
          }
        });
        userId = newUser.id;
      }

      // 3. Verificamos que el usuario exista (por seguridad)
      const userExists = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!userExists || userExists.deletedAt) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Actualizar datos básicos del usuario si vienen
      if (cvData.fullName || normalizedDni || cvData.sector) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            ...(cvData.fullName ? { fullName: cvData.fullName } : {}),
            ...(normalizedDni ? { dni: normalizedDni } : {}),
            ...(cvData.sector ? { sector: cvData.sector } : {}),
          },
        });
      }

      // 3.5 Procesar archivos multimedia (merge con multimedia existente)
      const existingCv = await this.prisma.cV.findUnique({ where: { userId } });
      const existingMultimedia = (existingCv?.multimedia as Record<string, any>) || {};
      const multimediaUrls: any = {
        ...existingMultimedia,
        ...(typeof cvData.multimedia === 'object' && cvData.multimedia ? cvData.multimedia : {}),
      };

      const profileMeta = {
        ...(existingMultimedia.profileMeta || {}),
        birthDate: cvData.birthDate ?? existingMultimedia.profileMeta?.birthDate,
        educationLevel: cvData.educationLevel ?? existingMultimedia.profileMeta?.educationLevel,
        titles: cvData.titles ?? existingMultimedia.profileMeta?.titles,
        currentOccupation: cvData.currentOccupation ?? existingMultimedia.profileMeta?.currentOccupation,
        softSkills: cvData.softSkills ?? existingMultimedia.profileMeta?.softSkills,
        nativeLanguage: cvData.nativeLanguage ?? existingMultimedia.profileMeta?.nativeLanguage,
        vulnerableGroup: cvData.vulnerableGroup ?? existingMultimedia.profileMeta?.vulnerableGroup,
      };
      multimediaUrls.profileMeta = profileMeta;
      
      if (files) {
        if (files.profilePhoto?.[0]) {
          const result = await this.cloudinaryService.uploadImage(files.profilePhoto[0]);
          multimediaUrls.profilePhoto = result.secure_url;
        }
        if (files.coverPhoto?.[0]) {
          const result = await this.cloudinaryService.uploadImage(files.coverPhoto[0]);
          multimediaUrls.coverPhoto = result.secure_url;
        }
        if (files.dniFront?.[0]) {
          const result = await this.cloudinaryService.uploadImage(files.dniFront[0]);
          multimediaUrls.dniFront = result.secure_url;
        }
        if (files.dniBack?.[0]) {
          const result = await this.cloudinaryService.uploadImage(files.dniBack[0]);
          multimediaUrls.dniBack = result.secure_url;
        }
        if (files.presentationVideo?.[0]) {
          const result = await this.cloudinaryService.uploadFile(files.presentationVideo[0], 'sigeli/cv/videos');
          multimediaUrls.presentationVideo = result.secure_url;
        }
      }

      const miningYears = Number(cvData.yearsExperienceMining ?? 0);
      const generalYears = Number(cvData.yearsExperienceGeneral ?? 0);
      const totalYears = Number(
        cvData.yearsExperience ?? (miningYears + generalYears),
      );

      // 4. Creamos o actualizamos el CV
      const cv = await this.prisma.cV.upsert({
        where: { userId },
        update: {
          aiSummary: cvData.aiSummary,
          specialty: cvData.specialty || cvData.currentOccupation || undefined,
          yearsExperience: new Prisma.Decimal(totalYears || 0),
          yearsExperienceMining: new Prisma.Decimal(miningYears || 0),
          yearsExperienceGeneral: new Prisma.Decimal(generalYears || 0),
          multimedia: multimediaUrls as Prisma.JsonObject,
          blockchainHash: cvData.blockchainHash,
          updatedAt: new Date(),
        },
        create: {
          userId,
          aiSummary: cvData.aiSummary,
          specialty: cvData.specialty || cvData.currentOccupation,
          yearsExperience: new Prisma.Decimal(totalYears || 0),
          yearsExperienceMining: new Prisma.Decimal(miningYears || 0),
          yearsExperienceGeneral: new Prisma.Decimal(generalYears || 0),
          multimedia: multimediaUrls as Prisma.JsonObject,
          blockchainHash: cvData.blockchainHash,
        },
      });

      // 5. Recalculamos años SOLO si hay registros estructurados de experiencia laboral
      const hasExperienceRecords = await this.prisma.experienciaLaboral.count({
        where: { cvId: cv.id, deletedAt: null }
      });

      if (hasExperienceRecords > 0) {
        await this.recalculateYearsExperience(cv.id);
      }

      return this.findByUserId(userId);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      // Capturar errores de duplicados de Prisma (P2002)
      if (error.code === 'P2002') {
        const fields = error.meta?.target;
        const fieldHint = Array.isArray(fields)
          ? fields.join(', ')
          : String(fields || 'DNI o email');
        throw new ConflictException(
          `Ya existe un registro con el mismo ${fieldHint}. No se permiten duplicados. Busque el perfil existente.`,
        );
      }
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
          area: dto.area || null,
          logros: dto.logros || null,
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
          area: dto.area || null,
          logros: dto.logros || null,
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

  /** Edad a partir de DDMMYYYY o ISO. null si inválida. */
  private calcularEdad(birthDateStr: string): number | null {
    const digits = birthDateStr.replace(/[^\d]/g, '');
    let d: Date | null = null;
    if (digits.length === 8) {
      const dd = Number(digits.slice(0, 2));
      const mm = Number(digits.slice(2, 4));
      const yyyy = Number(digits.slice(4, 8));
      d = new Date(yyyy, mm - 1, dd);
      if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) {
        d = null;
      }
    } else {
      const iso = new Date(birthDateStr);
      d = isNaN(iso.getTime()) ? null : iso;
    }
    if (!d) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age;
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

  async findAll() {
    const cvs = await this.prisma.cV.findMany({
      where: {
        user: {
          role: 'COMUNERO'
        }
      },
      include: {
        habilidades: true,
        experiencias: {
          where: { deletedAt: null },
          select: { company: true, position: true },
          take: 5,
        },
        user: {
          select: {
            fullName: true,
            dni: true,
            trustLevel: true,
            role: true,
            points: true,
            sector: true,
            createdAt: true,
            tenant: { select: { name: true } }
          }
        }
      }
    });
    return cvs.map(cv => this.decryptCV(cv));
  }

  /**
   * Búsqueda robusta de CVs por DNI, nombre y/o empresa (experiencia o contratos).
   * Incluye comuneros sin CV aún (ficha mínima) cuando coinciden DNI/nombre.
   * `trabajoMina` filtra quienes tienen experiencia minera o contrato.
   */
  async search(params: {
    q?: string;
    dni?: string;
    nombre?: string;
    empresa?: string;
    trabajoMina?: boolean | string;
  }) {
    const q = (params.q || '').trim();
    const dni = (params.dni || '').replace(/\D/g, '');
    const nombre = (params.nombre || '').trim();
    const empresa = (params.empresa || '').trim();
    const soloMina =
      params.trabajoMina === true ||
      String(params.trabajoMina) === '1' ||
      String(params.trabajoMina).toLowerCase() === 'true';

    const userWhere: Prisma.UserWhereInput = {
      role: 'COMUNERO',
      deletedAt: null,
    };
    if (dni) userWhere.dni = { contains: dni };
    if (nombre) userWhere.fullName = { contains: nombre, mode: 'insensitive' };

    if (q && !dni && !nombre && !empresa && !soloMina) {
      const qDigits = q.replace(/\D/g, '');
      userWhere.OR = [
        ...(qDigits.length > 0 ? [{ dni: { contains: qDigits } }] : []),
        { fullName: { contains: q, mode: 'insensitive' } },
        { sector: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (soloMina) {
      userWhere.AND = [
        ...(Array.isArray(userWhere.AND) ? userWhere.AND : userWhere.AND ? [userWhere.AND] : []),
        {
          OR: [
            {
              cv: {
                OR: [
                  { yearsExperienceMining: { gt: 0 } },
                  {
                    experiencias: {
                      some: { deletedAt: null, categoria: 'MINERIA' },
                    },
                  },
                ],
              },
            },
            { contratos: { some: { deletedAt: null } } },
          ],
        },
      ];
    }

    const users = await this.prisma.user.findMany({
      where: {
        ...userWhere,
        ...(empresa
          ? {
              OR: [
                {
                  cv: {
                    experiencias: {
                      some: {
                        deletedAt: null,
                        company: { contains: empresa, mode: 'insensitive' },
                      },
                    },
                  },
                },
                {
                  contratos: {
                    some: {
                      deletedAt: null,
                      companyName: { contains: empresa, mode: 'insensitive' },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        tenant: { select: { name: true } },
        cv: {
          include: {
            habilidades: true,
            experiencias: {
              where: { deletedAt: null },
              select: {
                company: true,
                position: true,
                area: true,
                categoria: true,
              },
              take: 8,
              orderBy: { startDate: 'desc' },
            },
          },
        },
        contratos: {
          where: { deletedAt: null },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { fullName: 'asc' },
      take: 100,
    });

    return users.map((u) => {
      const { cv, contratos, ...user } = u as any;
      const yearsMining = cv?.yearsExperienceMining
        ? Number(cv.yearsExperienceMining)
        : 0;
      const tieneExpMina =
        yearsMining > 0 ||
        (cv?.experiencias || []).some((e: any) => e.categoria === 'MINERIA');
      const trabajoEnMina = !!(tieneExpMina || (contratos?.length || 0) > 0);

      if (cv) {
        return {
          ...this.decryptCV({
            ...cv,
            user: {
              id: user.id,
              fullName: user.fullName,
              dni: user.dni,
              trustLevel: user.trustLevel,
              role: user.role,
              points: user.points,
              sector: user.sector,
              gender: user.gender,
              createdAt: user.createdAt,
              tenant: user.tenant,
            },
          }),
          trabajoEnMina,
          yearsExperienceMining: yearsMining,
        };
      }
      return {
        id: null,
        userId: user.id,
        specialty: null,
        yearsExperience: 0,
        yearsExperienceMining: 0,
        aiSummary: null,
        habilidades: [],
        experiencias: [],
        trabajoEnMina,
        user: {
          id: user.id,
          fullName: user.fullName,
          dni: user.dni,
          trustLevel: user.trustLevel,
          role: user.role,
          points: user.points,
          sector: user.sector,
          gender: user.gender,
          createdAt: user.createdAt,
          tenant: user.tenant,
        },
        sinCv: true,
      };
    });
  }

  private decryptCV(cv: any) {
    if (cv.user) {
      cv.user.email = cv.user.email ? this.cryptoService.decrypt(cv.user.email) : null;
      cv.user.phone = cv.user.phone ? this.cryptoService.decrypt(cv.user.phone) : null;
    }
    return cv;
  }
}
