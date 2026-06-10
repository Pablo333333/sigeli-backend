import { IsString, IsInt, IsBoolean, IsOptional, IsUUID, Min, Max } from 'class-validator';

export class CreateEvaluacionDto {
  @IsUUID()
  contractId: string;

  @IsUUID()
  evaluatorId: string;

  @IsUUID()
  evaluadoId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  satisfaccion: number;

  @IsBoolean()
  discriminacion: boolean;

  @IsOptional()
  @IsString()
  feedbackTexto?: string;

  @IsOptional()
  @IsString()
  grabacionUrl?: string;
}
