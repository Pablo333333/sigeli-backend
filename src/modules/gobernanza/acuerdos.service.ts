import { Injectable, InternalServerErrorException, UseInterceptors, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAcuerdoDto, UpdateAcuerdoStatusDto } from './dto/acuerdo.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Prisma } from '@prisma/client';

@Injectable()
@UseInterceptors(AuditInterceptor)
export class AcuerdosService {
  constructor(private readonly prisma: PrismaService) {}

  async createAcuerdo(dto: CreateAcuerdoDto) {
    try {
      return await this.prisma.acuerdo.create({
        data: {
          titulo: dto.titulo,
          descripcion: dto.descripcion,
          fechaFirma: new Date(dto.fechaFirma),
          fechaCumplimiento: dto.fechaCumplimiento ? new Date(dto.fechaCumplimiento) : null,
          partesInvolucradas: dto.partesInvolucradas as unknown as Prisma.JsonArray,
          documentoUrl: dto.documentoUrl,
          estado: 'PENDIENTE',
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(`Error al crear acuerdo: ${error.message}`);
    }
  }

  async updateEstado(id: string, dto: UpdateAcuerdoStatusDto) {
    try {
      const acuerdo = await this.prisma.acuerdo.findUnique({ where: { id } });
      if (!acuerdo) throw new NotFoundException('Acuerdo no encontrado');

      return await this.prisma.acuerdo.update({
        where: { id },
        data: {
          estado: dto.estado,
          documentoUrl: dto.documentoUrl || acuerdo.documentoUrl,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(`Error al actualizar acuerdo: ${error.message}`);
    }
  }

  async findAll() {
    return this.prisma.acuerdo.findMany({
      orderBy: { fechaFirma: 'desc' },
    });
  }
}
