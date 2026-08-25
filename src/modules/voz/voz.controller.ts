import { Controller, Post, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
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
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async transcribir(
    @UploadedFile() file: Express.Multer.File,
    @Body('usuarioId') usuarioId: string,
    @Body('idioma') idioma: string,
  ) {
    const mensajeTranscrito = await this.vozService.transcribirAudio(file, idioma);
    const respuesta = await this.vozService.procesarConsulta(
      usuarioId,
      mensajeTranscrito,
      idioma,
    );

    return {
      ...respuesta,
      /** Texto reconocido (STT) para mostrar en el chat del usuario */
      original: mensajeTranscrito,
      transcripcion: mensajeTranscrito,
    };
  }
}
