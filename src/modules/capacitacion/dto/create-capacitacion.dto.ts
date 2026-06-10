import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateCapacitacionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  sector: string;

  @IsOptional()
  @IsObject()
  learningPath?: any;
}
