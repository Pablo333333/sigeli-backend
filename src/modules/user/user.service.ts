import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CryptoService } from '../../common/services/crypto.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  async createUser(data: any) {
    const encryptedData = {
      ...data,
      email: data.email ? this.cryptoService.encrypt(data.email) : null,
      phone: data.phone ? this.cryptoService.encrypt(data.phone) : null,
    };

    return this.prisma.user.create({
      data: encryptedData,
    });
  }

  async findByDni(dni: string) {
    const user = await this.prisma.user.findUnique({
      where: { dni },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    return this.decryptUser(user);
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    return this.decryptUser(user);
  }

  private decryptUser(user: any) {
    return {
      ...user,
      email: user.email ? this.cryptoService.decrypt(user.email) : null,
      phone: user.phone ? this.cryptoService.decrypt(user.phone) : null,
    };
  }
}
