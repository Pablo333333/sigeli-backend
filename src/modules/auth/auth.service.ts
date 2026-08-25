import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BiometriaService } from '../../common/services/biometria.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly biometriaService: BiometriaService,
  ) {}

  private buildAuthResponse(user: {
    id: string;
    fullName: string;
    email: string | null;
    role: string;
    points: number;
    dni: string;
    sector: string | null;
    trustLevel: string;
  }, extra?: Record<string, unknown>) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        points: user.points ?? 0,
        dni: user.dni,
        sector: user.sector,
        trustLevel: user.trustLevel,
      },
      ...extra,
    };
  }

  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    let isMatch = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(pass, user.password);
    } else if (user.password === pass) {
      isMatch = true;
      const hashed = await bcrypt.hash(pass, 10);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashed },
      });
    }

    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.buildAuthResponse(user);
  }

  /**
   * Endpoint definitivo de biometría facial (Android/iOS).
   * multipart: dni + photo
   * - Primera vez: enrola el rostro
   * - Siguientes: verifica similitud perceptual
   * query/body opcional: reenroll=true para forzar nuevo registro
   */
  async verifyBiometric(
    dni: string,
    photo?: Express.Multer.File,
    allowReenroll = false,
  ) {
    if (!dni || dni.trim().length !== 8 || !/^\d{8}$/.test(dni.trim())) {
      throw new UnauthorizedException('DNI inválido. Debe tener 8 dígitos.');
    }

    if (!photo?.buffer?.length) {
      throw new UnauthorizedException('Se requiere una foto facial para continuar.');
    }

    const user = await this.prisma.user.findUnique({
      where: { dni: dni.trim() },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('No existe un comunero registrado con ese DNI.');
    }

    const result = await this.biometriaService.validarIdentidad(user.id, photo.buffer, {
      allowReenroll,
    });

    return this.buildAuthResponse(user, {
      biometric: {
        enrolled: result.enrolled,
        verified: true,
        distance: result.distance ?? null,
        message: result.enrolled
          ? 'Rostro registrado correctamente. Próximos ingresos verificarán tu biometría.'
          : 'Identidad facial verificada.',
      },
    });
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }
}
