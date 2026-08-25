import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { CreateOfertaDto, UpdateOfertaDto } from './dto/create-oferta.dto';
import { OfertaStatus, Prisma, Role } from '@prisma/client';

@Injectable()
export class OfertaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  private daysLeft(fechaCierre?: Date | null): number | null {
    if (!fechaCierre) return null;
    const now = new Date();
    const end = new Date(fechaCierre);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  private mapOferta(oferta: any) {
    const days = this.daysLeft(oferta.fechaCierre);
    const isCulminado =
      oferta.status === OfertaStatus.CULMINADO ||
      (days !== null && days < 0);

    return {
      ...oferta,
      salary: Number(oferta.salary),
      company: oferta.companyName || oferta.tenant?.name || 'Empresa convocante',
      location: oferta.sector,
      daysLeft: days === null ? null : Math.max(days, 0),
      estadoLabel: isCulminado
        ? 'Culminado'
        : days === null
          ? 'Vigente'
          : `Vigente (faltan ${Math.max(days, 0)} días)`,
      // Compatibilidad con clientes que aún miran ABIERTA
      statusLegacy: isCulminado ? 'CERRADA' : 'ABIERTA',
    };
  }

  async findAll(includeCulminadas = false) {
    // Auto-culminar ofertas vencidas
    await this.prisma.oferta.updateMany({
      where: {
        status: OfertaStatus.VIGENTE,
        deletedAt: null,
        fechaCierre: { lt: new Date() },
      },
      data: { status: OfertaStatus.CULMINADO },
    });

    const ofertas = await this.prisma.oferta.findMany({
      where: {
        deletedAt: null,
        ...(includeCulminadas ? {} : { status: OfertaStatus.VIGENTE, vacancies: { gt: 0 } }),
      },
      include: {
        tenant: { select: { id: true, name: true } },
        _count: { select: { postulaciones: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ofertas.map((o) => this.mapOferta(o));
  }

  async findOne(id: string) {
    const oferta = await this.prisma.oferta.findFirst({
      where: { id, deletedAt: null },
      include: {
        tenant: { select: { id: true, name: true } },
        _count: { select: { postulaciones: true } },
      },
    });
    if (!oferta) throw new NotFoundException('Oferta no encontrada');
    return this.mapOferta(oferta);
  }

  async create(dto: CreateOfertaDto, notify = true) {
    try {
      let companyName = dto.companyName;
      if (dto.tenantId && !companyName) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
        companyName = tenant?.name;
      }

      const oferta = await this.prisma.oferta.create({
        data: {
          title: dto.title,
          description: dto.description,
          perfilRequisitos: dto.perfilRequisitos,
          requirements: dto.requirements ?? Prisma.JsonNull,
          salary: new Prisma.Decimal(dto.salary),
          sector: dto.sector,
          vacancies: dto.vacancies ?? 1,
          status: dto.status ?? OfertaStatus.VIGENTE,
          tenantId: dto.tenantId,
          companyName,
          tipoManoObra: dto.tipoManoObra,
          fechaInicioProyectada: dto.fechaInicioProyectada
            ? new Date(dto.fechaInicioProyectada)
            : null,
          fechaCierre: dto.fechaCierre ? new Date(dto.fechaCierre) : null,
          regimenLaboral: dto.regimenLaboral,
          tiempoContratoMeses: dto.tiempoContratoMeses,
          horarioTrabajo: dto.horarioTrabajo,
          sistemaTrabajo: dto.sistemaTrabajo,
          notaAviso: dto.notaAviso,
        },
        include: {
          tenant: { select: { id: true, name: true } },
        },
      });

      if (notify && oferta.status === OfertaStatus.VIGENTE) {
        const comuneros = await this.prisma.user.findMany({
          where: { role: Role.COMUNERO, deletedAt: null },
          select: { id: true },
        });
        await this.notificacionesService.enviarAlertaOferta(oferta, comuneros);
      }

      return this.mapOferta(oferta);
    } catch (error) {
      throw new InternalServerErrorException(`Error al crear oferta: ${error.message}`);
    }
  }

  async update(id: string, dto: UpdateOfertaDto) {
    const existing = await this.prisma.oferta.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Oferta no encontrada');

    let companyName = dto.companyName;
    if (dto.tenantId && companyName === undefined) {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
      companyName = tenant?.name;
    }

    const oferta = await this.prisma.oferta.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.perfilRequisitos !== undefined ? { perfilRequisitos: dto.perfilRequisitos } : {}),
        ...(dto.requirements !== undefined ? { requirements: dto.requirements } : {}),
        ...(dto.salary !== undefined ? { salary: new Prisma.Decimal(dto.salary) } : {}),
        ...(dto.sector !== undefined ? { sector: dto.sector } : {}),
        ...(dto.vacancies !== undefined ? { vacancies: dto.vacancies } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.tenantId !== undefined ? { tenantId: dto.tenantId } : {}),
        ...(companyName !== undefined ? { companyName } : {}),
        ...(dto.tipoManoObra !== undefined ? { tipoManoObra: dto.tipoManoObra } : {}),
        ...(dto.fechaInicioProyectada !== undefined
          ? {
              fechaInicioProyectada: dto.fechaInicioProyectada
                ? new Date(dto.fechaInicioProyectada)
                : null,
            }
          : {}),
        ...(dto.fechaCierre !== undefined
          ? { fechaCierre: dto.fechaCierre ? new Date(dto.fechaCierre) : null }
          : {}),
        ...(dto.regimenLaboral !== undefined ? { regimenLaboral: dto.regimenLaboral } : {}),
        ...(dto.tiempoContratoMeses !== undefined
          ? { tiempoContratoMeses: dto.tiempoContratoMeses }
          : {}),
        ...(dto.horarioTrabajo !== undefined ? { horarioTrabajo: dto.horarioTrabajo } : {}),
        ...(dto.sistemaTrabajo !== undefined ? { sistemaTrabajo: dto.sistemaTrabajo } : {}),
        ...(dto.notaAviso !== undefined ? { notaAviso: dto.notaAviso } : {}),
      },
      include: {
        tenant: { select: { id: true, name: true } },
        _count: { select: { postulaciones: true } },
      },
    });

    return this.mapOferta(oferta);
  }

  async softDelete(id: string) {
    const existing = await this.prisma.oferta.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Oferta no encontrada');

    await this.prisma.oferta.update({
      where: { id },
      data: { deletedAt: new Date(), status: OfertaStatus.CULMINADO },
    });

    return { ok: true };
  }
}
