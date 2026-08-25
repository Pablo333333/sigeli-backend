import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Cuestionario completo de satisfacción del trabajador (Evaluación 360°).
 * Alineado con el formulario mobile / documento Ciro.
 */
export class CuestionarioSatisfaccionDto {
  @IsBoolean()
  contratoATiempo: boolean;

  @IsBoolean()
  deberesExplicados: boolean;

  @IsBoolean()
  derechosExplicados: boolean;

  @IsBoolean()
  pagoPuntual: boolean;

  @IsBoolean()
  capacitacionSeguridad: boolean;

  @IsBoolean()
  herramientasAdecuadas: boolean;

  @IsInt()
  @Min(1)
  @Max(5)
  logisticaAlimentacion: number;

  @IsInt()
  @Min(1)
  @Max(5)
  logisticaTransporte: number;

  @IsInt()
  @Min(1)
  @Max(5)
  climaLaboral: number;

  @IsInt()
  @Min(1)
  @Max(5)
  tratoSupervisor: number;

  @IsInt()
  @Min(1)
  @Max(5)
  satisfaccionGeneral: number;

  @IsBoolean()
  discriminacion: boolean;

  @IsOptional()
  @IsString()
  tipoDiscriminacion?: string;

  @IsBoolean()
  recomendariaEmpresa: boolean;

  @IsOptional()
  @IsString()
  comentarios?: string;
}

export class CreateEvaluacionDto {
  @IsUUID()
  contractId: string;

  @ValidateNested()
  @Type(() => CuestionarioSatisfaccionDto)
  cuestionario: CuestionarioSatisfaccionDto;

  @IsOptional()
  @IsString()
  grabacionUrl?: string;
}
