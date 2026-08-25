import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class CreateReclamoDto {
  @IsUUID()
  @IsOptional()
  userId?: string;

  /** Empresa/contratista involucrada. Si no se envía, se usa el tenant del usuario o la primera minera. */
  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @IsString()
  @IsNotEmpty()
  motivo: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  nombreAfectado?: string;

  @IsString()
  @IsOptional()
  categoria?: string;
}
