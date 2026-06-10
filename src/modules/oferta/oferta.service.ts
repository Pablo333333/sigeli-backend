import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class OfertaService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.oferta.findMany({
      where: { status: 'ABIERTA' },
      take: 5,
    });
  }

  async findOne(id: string) {
    return this.prisma.oferta.findUnique({ where: { id } });
  }
}
