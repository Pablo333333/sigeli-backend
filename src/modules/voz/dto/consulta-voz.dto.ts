import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class ConsultaVozDto {
  @IsUUID()
  usuarioId: string;

  @IsString()
  @IsNotEmpty()
  mensaje: string;

  @IsOptional()
  @IsString()
  idioma?: 'ES' | 'QU'; // Español o Quechua
}
