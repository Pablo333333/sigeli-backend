import { IsString, IsNotEmpty, IsEnum, IsDateString, IsOptional, IsUUID } from 'class-validator';
import { ExperienciaCategoria } from '@prisma/client';

export class UpdateExperienciaDto {
  @IsUUID()
  @IsOptional()
  id?: string; // Si viene ID es update, si no es create

  @IsString()
  @IsNotEmpty()
  company: string;

  @IsString()
  @IsNotEmpty()
  position: string;

  @IsEnum(ExperienciaCategoria)
  categoria: ExperienciaCategoria;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
