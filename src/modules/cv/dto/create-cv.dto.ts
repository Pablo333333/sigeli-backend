import { 
  IsString, 
  IsNumber, 
  IsOptional, 
  IsUUID, 
  IsObject
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCVDto {
  @IsOptional()
  @IsUUID()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  dni?: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  aiSummary?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  yearsExperience?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  yearsExperienceMining?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  yearsExperienceGeneral?: number;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  educationLevel?: string;

  @IsOptional()
  @IsString()
  titles?: string;

  @IsOptional()
  @IsString()
  currentOccupation?: string;

  @IsOptional()
  @IsString()
  softSkills?: string;

  @IsOptional()
  @IsString()
  nativeLanguage?: string;

  @IsOptional()
  @IsString()
  vulnerableGroup?: string;

  @IsOptional()
  @IsObject()
  multimedia?: any;

  @IsOptional()
  @IsString()
  blockchainHash?: string;
}
