import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class OfertaService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.oferta.findMany({
      where: { 
        status: 'ABIERTA',
        vacancies: { gt: 0 },
        deletedAt: null
      },
      select: {
        id: true,
        title: true,
        sector: true,
        vacancies: true,
        _count: {
          select: { postulaciones: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    return this.prisma.oferta.findUnique({ where: { id } });
  }
}
