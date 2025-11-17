import {
  IsNumber,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FieldResponseItemDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty({ message: 'Field ID is required' })
  fieldId: number;

  @IsString()
  @IsOptional()
  value?: string; // For text, number, date, dropdown

  @IsString()
  @IsOptional()
  filePath?: string; // For upload fields

  @IsString()
  @IsOptional()
  fileName?: string; // For upload fields

  @IsNumber()
  @IsOptional()
  fileSize?: number; // For upload fields
}

export class SubmitFieldResponseDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty({ message: 'Application ID is required' })
  applicationId: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  travelerId?: number; // Optional: if provided, responses are stored for this specific traveler

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldResponseItemDto)
  responses: FieldResponseItemDto[];
}

