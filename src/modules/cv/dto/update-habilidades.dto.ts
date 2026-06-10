import { IsString, IsArray, IsNotEmpty } from 'class-validator';

export class UpdateHabilidadesDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  names: string[];
}
