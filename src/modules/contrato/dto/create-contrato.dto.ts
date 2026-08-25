import {
  IsUUID,
  IsDateString,
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoManoObra, ContractStatus } from '@prisma/client';

export class CreateContratoDto {
  @IsUUID()
  postulacionId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  salary: number;

  @IsOptional()
  @IsString()
  regimenLaboral?: string;

  /** Token biométrico; opcional para EMPRESA/ADMIN (formalización administrativa). */
  @IsOptional()
  @IsString()
  biometricToken?: string;

  @IsOptional()
  @IsString()
  numeroContrato?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  puesto?: string;

  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsEnum(TipoManoObra)
  tipoManoObra?: TipoManoObra;

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
  observaciones?: string;
}

export class UpdateContratoDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  salary?: number;

  @IsOptional()
  @IsString()
  regimenLaboral?: string;

  @IsOptional()
  @IsString()
  numeroContrato?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  puesto?: string;

  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsEnum(TipoManoObra)
  tipoManoObra?: TipoManoObra;

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
  observaciones?: string;

  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;
}

export class SearchContratosDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  dni?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  empresa?: string;
}
