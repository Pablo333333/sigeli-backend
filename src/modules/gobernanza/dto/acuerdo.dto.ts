import { IsString, IsNotEmpty, IsDateString, IsOptional, IsArray, IsEnum } from 'class-validator';

export class CreateAcuerdoDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsDateString()
  fechaFirma: string;

  @IsOptional()
  @IsDateString()
  fechaCumplimiento?: string;

  @IsArray()
  partesInvolucradas: string[];

  @IsOptional()
  @IsString()
  documentoUrl?: string;
}

export class UpdateAcuerdoStatusDto {
  @IsEnum(['PENDIENTE', 'CUMPLIDO'])
  estado: string;

  @IsOptional()
  @IsString()
  documentoUrl?: string;
}
