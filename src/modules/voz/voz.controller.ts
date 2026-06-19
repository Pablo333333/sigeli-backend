import { Controller, Post, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VozService } from './voz.service';
import { ConsultaVozDto } from './dto/consulta-voz.dto';

@Controller('voz')
export class VozController {
  constructor(private readonly vozService: VozService) {}

  @Post('consulta')
  async consulta(@Body() dto: ConsultaVozDto) {
    return this.vozService.procesarConsulta(dto.usuarioId, dto.mensaje, dto.idioma);
  }

  @Post('transcribir')
  @UseInterceptors(FileInterceptor('audio'))
  async transcribir(
    @UploadedFile() file: Express.Multer.File,
    @Body('usuarioId') usuarioId: string,
    @Body('idioma') idioma: string,
  ) {
    // 1. Transcribir audio a texto (Simulado)
    const mensajeTranscrito = await this.vozService.transcribirAudio(file);
    
    // 2. Procesar consulta con el texto obtenido
    return this.vozService.procesarConsulta(usuarioId, mensajeTranscrito, idioma);
  }
}
