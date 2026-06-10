import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApplicationStatus } from '@prisma/client';

export class UpdatePostulacionStatusDto {
  @IsEnum(ApplicationStatus)
  newStatus: ApplicationStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}
