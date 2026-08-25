import { IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ComunicacionEstado } from '@prisma/client';

export class SendComunicacionDto {
  @IsUUID()
  postulacionId: string;

  @IsString()
  mensaje: string;

  @IsOptional()
  @IsUUID()
  destinatarioId?: string;
}

export class UpdateComunicacionEstadoDto {
  @IsEnum(ComunicacionEstado)
  estado: ComunicacionEstado;
}
