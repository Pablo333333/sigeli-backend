import { IsUUID, IsString, IsOptional } from 'class-validator';

export class CreatePostulacionDto {
  /** Candidato comunero. Obligatorio si quien postula es Directiva/Empresa/Admin. */
  @IsUUID()
  @IsString()
  @IsOptional()
  userId?: string;

  @IsUUID()
  @IsString()
  ofertaId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
