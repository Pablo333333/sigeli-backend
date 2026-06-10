import { Controller, Post, Body } from '@nestjs/common';
import { VozService } from './voz.service';
import { ConsultaVozDto } from './dto/consulta-voz.dto';

@Controller('voz')
export class VozController {
  constructor(private readonly vozService: VozService) {}

  @Post('consulta')
  async consulta(@Body() dto: ConsultaVozDto) {
    return this.vozService.procesarConsulta(dto.usuarioId, dto.mensaje, dto.idioma);
  }
}
