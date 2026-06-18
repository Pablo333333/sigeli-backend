import { IsUUID, IsString, IsOptional } from 'class-validator';

export class CreatePostulacionDto {
  @IsUUID()
  @IsString()
  @IsOptional()
  userId?: string;

  @IsUUID()
  @IsString()
  ofertaId: string;
}
