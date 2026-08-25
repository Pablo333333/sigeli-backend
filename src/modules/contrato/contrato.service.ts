import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  UseInterceptors,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateContratoDto,
  UpdateContratoDto,
} from './dto/create-contrato.dto';
import { BiometriaService } from '../../common/services/biometria.service';
import { ApplicationStatus, ContractStatus, Prisma, Role } from '@prisma/client';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

const contratoInclude = {
  user: {
    select: {
      id: true,
      fullName: true,
      dni: true,
      phone: true,
      sector: true,
      email: true,
      gender: true,
      cv: { select: { multimedia: true, specialty: true } },
    },
  },
  postulacion: {
    include: {
      oferta: {
        select: {
          id: true,
          title: true,
          companyName: true,
          sector: true,
          tipoManoObra: true,
          regimenLaboral: true,
          horarioTrabajo: true,
          sistemaTrabajo: true,
          tiempoContratoMeses: true,
          salary: true,
        },
      },
    },
  },
} as const;

@Injectable()
@UseInterceptors(AuditInterceptor)
export class ContratoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly biometriaService: BiometriaService,
  ) {}

  private calcEdadFromBirth(raw?: string | null): number | null {
    if (!raw) return null;
    const digits = String(raw).replace(/\D/g, '');
    let d: Date | null = null;
    if (digits.length === 8) {
      const dd = Number(digits.slice(0, 2));
      const mm = Number(digits.slice(2, 4));
      const yyyy = Number(digits.slice(4, 8));
      d = new Date(yyyy, mm - 1, dd);
      if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) d = null;
    } else {
      const iso = new Date(raw);
      d = isNaN(iso.getTime()) ? null : iso;
    }
    if (!d) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age;
  }

  private sexoLabel(gender?: string | null) {
    if (gender === 'MASCULINO') return 'Masculino';
    if (gender === 'FEMENINO') return 'Femenino';
    if (gender === 'OTRO') return 'Otro';
    return null;
  }

  /**
   * Prefill de matriz desde postulación/oferta/CV (para formulario).
   * Incluye edad/sexo autocompletados del comunero (campos clave Word).
   */
  async getPrefill(postulacionId: string) {
    const postulacion = await this.prisma.postulacion.findUnique({
      where: { id: postulacionId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            dni: true,
            sector: true,
            gender: true,
            cv: { select: { specialty: true, multimedia: true } },
          },
        },
        oferta: true,
        contrato: true,
      },
    });
    if (!postulacion || postulacion.deletedAt) {
      throw new NotFoundException('Postulación no encontrada');
    }

    const oferta = postulacion.oferta;
    const months = oferta?.tiempoContratoMeses || 12;
    const start = oferta?.fechaInicioProyectada
      ? new Date(oferta.fechaInicioProyectada)
      : new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);

    const multimedia = (postulacion.user.cv?.multimedia as any) || {};
    const birthDate = multimedia?.profileMeta?.birthDate || null;
    const edad = this.calcEdadFromBirth(birthDate);
    const sexo = this.sexoLabel(postulacion.user.gender);

    return {
      postulacionId: postulacion.id,
      yaTieneContrato: !!postulacion.contrato,
      contratoId: postulacion.contrato?.id || null,
      comunero: {
        userId: postulacion.user.id,
        fullName: postulacion.user.fullName,
        dni: postulacion.user.dni,
        sector: postulacion.user.sector,
        specialty: postulacion.user.cv?.specialty || null,
        edad,
        sexo,
        gender: postulacion.user.gender,
        birthDate,
      },
      matriz: {
        companyName: oferta?.companyName || null,
        puesto: oferta?.title || null,
        cargo: oferta?.title || null,
        area: null,
        sector: oferta?.sector || postulacion.user.sector || null,
        tipoManoObra: oferta?.tipoManoObra || null,
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        salary: oferta?.salary != null ? Number(oferta.salary) : 0,
        regimenLaboral: oferta?.regimenLaboral || '728',
        tiempoContratoMeses: months,
        horarioTrabajo: oferta?.horarioTrabajo || null,
        sistemaTrabajo: oferta?.sistemaTrabajo || null,
        observaciones: oferta?.notaAviso || null,
        numeroContrato: null,
      },
    };
  }

  async createContrato(
    dto: CreateContratoDto,
    actor?: { userId: string; role: string },
  ) {
    const { postulacionId, startDate, endDate, salary, biometricToken } = dto;

    try {
      const postulacion = await this.prisma.postulacion.findUnique({
        where: { id: postulacionId },
        include: { user: true, oferta: true },
      });

      if (!postulacion || postulacion.deletedAt) {
        throw new NotFoundException(`Postulación con ID ${postulacionId} no encontrada`);
      }

      const isAdminFlow =
        actor?.role === Role.ADMIN || actor?.role === Role.EMPRESA;

      if (!isAdminFlow) {
        if (!biometricToken) {
          throw new BadRequestException(
            'Se requiere validación biométrica para formalizar el contrato.',
          );
        }
        await this.biometriaService.validarIdentidadToken(
          postulacion.userId,
          biometricToken,
        );
      } else if (biometricToken) {
        try {
          await this.biometriaService.validarIdentidadToken(
            postulacion.userId,
            biometricToken,
          );
        } catch {
          // Admin/Empresa puede continuar sin biometría si falla
        }
      }

      const existingContrato = await this.prisma.contrato.findUnique({
        where: { postulacionId },
      });
      if (existingContrato && !existingContrato.deletedAt) {
        throw new ConflictException(
          'Ya existe un contrato formalizado para esta postulación.',
        );
      }

      const previousContracts = await this.prisma.contrato.findMany({
        where: { userId: postulacion.userId, deletedAt: null },
      });
      let totalDays = 0;
      previousContracts.forEach((c) => {
        const diff =
          new Date(c.endDate).getTime() - new Date(c.startDate).getTime();
        totalDays += Math.ceil(diff / (1000 * 3600 * 24));
      });
      const stabilityIndex = new Prisma.Decimal(totalDays / 30);

      const oferta = postulacion.oferta;
      const months =
        dto.tiempoContratoMeses ??
        oferta?.tiempoContratoMeses ??
        Math.max(
          1,
          Math.round(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) /
              (1000 * 3600 * 24 * 30),
          ),
        );

      const contrato = await this.prisma.contrato.create({
        data: {
          postulacionId,
          userId: postulacion.userId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          salary: new Prisma.Decimal(salary),
          regimenLaboral:
            dto.regimenLaboral || oferta?.regimenLaboral || 'Régimen General',
          status: ContractStatus.ACTIVO,
          stabilityIndex,
          numeroContrato: dto.numeroContrato || null,
          companyName: dto.companyName || oferta?.companyName || null,
          puesto: dto.puesto || oferta?.title || null,
          cargo: dto.cargo || dto.puesto || oferta?.title || null,
          area: dto.area || null,
          sector: dto.sector || oferta?.sector || postulacion.user.sector || null,
          tipoManoObra: dto.tipoManoObra || oferta?.tipoManoObra || null,
          tiempoContratoMeses: months,
          horarioTrabajo: dto.horarioTrabajo || oferta?.horarioTrabajo || null,
          sistemaTrabajo: dto.sistemaTrabajo || oferta?.sistemaTrabajo || null,
          observaciones: dto.observaciones || null,
        },
        include: contratoInclude,
      });

      if (postulacion.status !== ApplicationStatus.CONTRATADO) {
        const timeline = Array.isArray(postulacion.timeline)
          ? (postulacion.timeline as any[])
          : [];
        await this.prisma.postulacion.update({
          where: { id: postulacionId },
          data: {
            status: ApplicationStatus.CONTRATADO,
            timeline: [
              ...timeline,
              {
                status: ApplicationStatus.CONTRATADO,
                subStatus: 'SUBIDA_CONFIRMADA',
                date: new Date().toISOString(),
                notes: `Contrato formalizado bajo régimen ${contrato.regimenLaboral}.`,
                actorId: actor?.userId,
                actorRole: actor?.role,
              },
            ] as unknown as Prisma.JsonArray,
          },
        });
      }

      return this.enrichContrato(contrato);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al formalizar contrato: ${error.message}`,
      );
    }
  }

  async updateContrato(id: string, dto: UpdateContratoDto) {
    const existing = await this.prisma.contrato.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Contrato no encontrado');

    const updated = await this.prisma.contrato.update({
      where: { id },
      data: {
        ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.salary != null ? { salary: new Prisma.Decimal(dto.salary) } : {}),
        ...(dto.regimenLaboral !== undefined
          ? { regimenLaboral: dto.regimenLaboral }
          : {}),
        ...(dto.numeroContrato !== undefined
          ? { numeroContrato: dto.numeroContrato }
          : {}),
        ...(dto.companyName !== undefined ? { companyName: dto.companyName } : {}),
        ...(dto.puesto !== undefined ? { puesto: dto.puesto } : {}),
        ...(dto.cargo !== undefined ? { cargo: dto.cargo } : {}),
        ...(dto.area !== undefined ? { area: dto.area } : {}),
        ...(dto.sector !== undefined ? { sector: dto.sector } : {}),
        ...(dto.tipoManoObra !== undefined ? { tipoManoObra: dto.tipoManoObra } : {}),
        ...(dto.tiempoContratoMeses !== undefined
          ? { tiempoContratoMeses: dto.tiempoContratoMeses }
          : {}),
        ...(dto.horarioTrabajo !== undefined
          ? { horarioTrabajo: dto.horarioTrabajo }
          : {}),
        ...(dto.sistemaTrabajo !== undefined
          ? { sistemaTrabajo: dto.sistemaTrabajo }
          : {}),
        ...(dto.observaciones !== undefined
          ? { observaciones: dto.observaciones }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      include: contratoInclude,
    });
    return this.enrichContrato(updated);
  }

  private enrichContrato(c: any) {
    const multimedia = c.user?.cv?.multimedia as any;
    const birthDate = multimedia?.profileMeta?.birthDate || null;
    return {
      ...c,
      comuneroEdad: this.calcEdadFromBirth(birthDate),
      comuneroSexo: this.sexoLabel(c.user?.gender),
    };
  }

  async findAll() {
    const rows = await this.prisma.contrato.findMany({
      where: { deletedAt: null },
      include: contratoInclude,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((c) => this.enrichContrato(c));
  }

  /**
   * Búsqueda robusta por DNI, nombre del comunero y/o empresa.
   */
  async search(params: {
    q?: string;
    dni?: string;
    nombre?: string;
    empresa?: string;
  }) {
    const q = (params.q || '').trim();
    const dni = (params.dni || '').replace(/\D/g, '');
    const nombre = (params.nombre || '').trim();
    const empresa = (params.empresa || '').trim();

    const and: Prisma.ContratoWhereInput[] = [{ deletedAt: null }];

    if (dni) {
      and.push({ user: { dni: { contains: dni } } });
    }
    if (nombre) {
      and.push({
        user: { fullName: { contains: nombre, mode: 'insensitive' } },
      });
    }
    if (empresa) {
      and.push({
        OR: [
          { companyName: { contains: empresa, mode: 'insensitive' } },
          {
            postulacion: {
              oferta: {
                companyName: { contains: empresa, mode: 'insensitive' },
              },
            },
          },
        ],
      });
    }
    if (q && !dni && !nombre && !empresa) {
      const qDigits = q.replace(/\D/g, '');
      and.push({
        OR: [
          ...(qDigits
            ? [{ user: { dni: { contains: qDigits } } }]
            : []),
          { user: { fullName: { contains: q, mode: 'insensitive' } } },
          { companyName: { contains: q, mode: 'insensitive' } },
          { puesto: { contains: q, mode: 'insensitive' } },
          { numeroContrato: { contains: q, mode: 'insensitive' } },
          {
            postulacion: {
              oferta: {
                OR: [
                  { companyName: { contains: q, mode: 'insensitive' } },
                  { title: { contains: q, mode: 'insensitive' } },
                ],
              },
            },
          },
        ],
      });
    }

    return this.prisma.contrato.findMany({
      where: { AND: and },
      include: contratoInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
    }).then((rows) => rows.map((c) => this.enrichContrato(c)));
  }

  async getContratosProximosAVencer(dias: number) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dias);

    return this.prisma.contrato.findMany({
      where: {
        status: ContractStatus.ACTIVO,
        deletedAt: null,
        endDate: {
          lte: targetDate,
          gte: new Date(),
        },
      },
      include: {
        user: {
          select: {
            fullName: true,
            phone: true,
            dni: true,
          },
        },
        postulacion: {
          include: {
            oferta: { select: { title: true, companyName: true } },
          },
        },
      },
    });
  }
}
