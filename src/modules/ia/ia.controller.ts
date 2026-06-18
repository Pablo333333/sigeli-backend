import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { IAService } from './ia.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ia')
export class IAController {
  constructor(private readonly iaService: IAService) {}

  @UseGuards(JwtAuthGuard)
  @Post('generar-resumen')
  async generarResumen(@Body() body: { especialidad: string; experiencia: number }) {
    return this.iaService.generarResumen(body.especialidad, body.experiencia);
  }
}
