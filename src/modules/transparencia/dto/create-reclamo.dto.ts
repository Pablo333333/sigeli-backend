import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class CreateReclamoDto {
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsUUID()
  tenantId: string;

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
