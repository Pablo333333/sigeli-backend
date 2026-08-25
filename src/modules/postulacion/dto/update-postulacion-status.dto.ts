import { IsEnum, IsString, IsOptional, IsDateString, IsNumber, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApplicationStatus } from '@prisma/client';

class TimelineMetaDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  horasInduccion?: number;

  @IsOptional()
  @IsDateString()
  fechaSubida?: string;

  @IsOptional()
  @IsString()
  empleador?: string;
}

export class UpdatePostulacionStatusDto {
  @IsEnum(ApplicationStatus)
  newStatus: ApplicationStatus;

  @IsString()
  @IsOptional()
  subStatus?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  /** Fecha límite de la etapa (para alertas 5 días — Fase 4) */
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TimelineMetaDto)
  meta?: TimelineMetaDto;
}
