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

  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  yearsExperience: number;

  @IsOptional()
  @IsObject()
  multimedia?: any;

  @IsOptional()
  @IsString()
  blockchainHash?: string;
}
