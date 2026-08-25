import { IsString, IsNumber, IsOptional, IsUUID, IsInt, IsDateString, IsEnum, IsObject, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoManoObra, OfertaStatus } from '@prisma/client';

export class CreateOfertaDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  perfilRequisitos?: string;

  @IsOptional()
  @IsObject()
  requirements?: any;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  salary: number;

  @IsString()
  sector: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  vacancies?: number;

  @IsOptional()
  @IsEnum(OfertaStatus)
  status?: OfertaStatus;

  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsEnum(TipoManoObra)
  tipoManoObra?: TipoManoObra;

  @IsOptional()
  @IsDateString()
  fechaInicioProyectada?: string;

  @IsOptional()
  @IsDateString()
  fechaCierre?: string;

  @IsOptional()
  @IsString()
  regimenLaboral?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  tiempoContratoMeses?: number;

  @IsOptional()
  @IsString()
  horarioTrabajo?: string;

  @IsOptional()
  @IsString()
  sistemaTrabajo?: string;

  @IsOptional()
  @IsString()
  notaAviso?: string;
}

export class UpdateOfertaDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  perfilRequisitos?: string;

  @IsOptional()
  @IsObject()
  requirements?: any;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  salary?: number;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  vacancies?: number;

  @IsOptional()
  @IsEnum(OfertaStatus)
  status?: OfertaStatus;

  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsEnum(TipoManoObra)
  tipoManoObra?: TipoManoObra;

  @IsOptional()
  @IsDateString()
  fechaInicioProyectada?: string | null;

  @IsOptional()
  @IsDateString()
  fechaCierre?: string | null;

  @IsOptional()
  @IsString()
  regimenLaboral?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tiempoContratoMeses?: number | null;

  @IsOptional()
  @IsString()
  horarioTrabajo?: string;

  @IsOptional()
  @IsString()
  sistemaTrabajo?: string;

  @IsOptional()
  @IsString()
  notaAviso?: string;
}
