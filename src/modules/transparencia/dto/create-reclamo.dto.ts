import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateReclamoDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  motivo: string;
}
