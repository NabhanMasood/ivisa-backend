import {
  IsNumber,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class FieldResponseItemDto {
  @Transform(({ value }) => {
    // Handle null/undefined - return as-is
    if (value === null || value === undefined || value === '') {
      return value;
    }
    
    // If it's a string starting with '_', keep it as string (passport field)
    if (typeof value === 'string' && value.startsWith('_')) {
      return value;
    }
    
    // If it's already a number, return it
    if (typeof value === 'number') {
      return value;
    }
    
    // Try to convert to number for regular fields
    const num = Number(value);
    if (!isNaN(num) && value !== '') {
      return num;
    }
    
    // Return as-is if conversion failed
    return value;
  })
  fieldId: number | string | null; // Can be number (regular field), string (passport field), or null (will be validated in service)

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

