import { IsUUID, IsDateString, IsDecimal, IsString, IsNumber, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateContratoDto {
  @IsUUID()
  postulacionId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  @Type(() => Number)
  salary: number;

  @IsString()
  regimenLaboral: string;

  @IsString()
  @IsNotEmpty()
  biometricToken: string;
}
