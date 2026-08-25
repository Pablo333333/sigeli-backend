import { IsString, IsNotEmpty, IsEnum, IsDateString, IsOptional, IsUUID } from 'class-validator';
import { ExperienciaCategoria } from '@prisma/client';

export class UpdateExperienciaDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  company: string;

  @IsString()
  @IsNotEmpty()
  position: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  logros?: string;

  @IsEnum(ExperienciaCategoria)
  categoria: ExperienciaCategoria;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
