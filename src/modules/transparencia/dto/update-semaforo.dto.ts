import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { TrustLevel } from '@prisma/client';

export class UpdateSemaforoDto {
  @IsEnum(TrustLevel)
  nivel: TrustLevel;

  @IsString()
  @IsNotEmpty()
  justificacion: string;
}
