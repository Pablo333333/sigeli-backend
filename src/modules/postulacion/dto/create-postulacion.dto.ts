import { IsUUID, IsString } from 'class-validator';

export class CreatePostulacionDto {
  @IsUUID()
  @IsString()
  userId: string;

  @IsUUID()
  @IsString()
  ofertaId: string;
}
