import { IsString, IsNotEmpty, IsOptional, IsObject, IsEnum, IsBoolean, IsInt, Min } from 'class-validator';
import { TipoCapacitacion } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateCapacitacionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  sector: string;

  @IsOptional()
  @IsObject()
  learningPath?: any;

  @IsOptional()
  @IsEnum(TipoCapacitacion)
  tipo?: TipoCapacitacion;

  @IsOptional()
  @IsString()
  socioOrganizador?: string;
}

export class UpsertEncuestaEntrenamientoDto {
  @IsBoolean()
  capacitadoPorAntamina: boolean;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  anioParticipacion?: number;

  @IsOptional()
  @IsString()
  socioOrganizador?: string;

  @IsOptional()
  @IsString()
  nombrePrograma?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  horas?: number;

  @IsOptional()
  @IsString()
  temas?: string;

  @IsOptional()
  @IsBoolean()
  obtuvoCertificado?: boolean;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsObject()
  respuestas?: Record<string, unknown>;
}
