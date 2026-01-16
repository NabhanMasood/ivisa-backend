import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  IsEnum,
  Min,
} from 'class-validator';
import { FieldType } from '../entities/visa-product-field.entity';

export class UpdateVisaProductFieldDto {
  @IsNumber()
  @IsOptional()
  visaProductId?: number;

  @IsEnum(FieldType, { message: 'Invalid field type' })
  @IsOptional()
  fieldType?: FieldType;

  @IsString()
  @IsOptional()
  question?: string;

  @IsString()
  @IsOptional()
  placeholder?: string;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  // For dropdown fields
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  options?: string[];

  // For dropdown fields - use countries list instead of custom options
  @IsBoolean()
  @IsOptional()
  useCountriesList?: boolean;

  // For upload fields
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedFileTypes?: string[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxFileSizeMB?: number;

  // For text/number fields
  @IsNumber()
  @Min(0)
  @IsOptional()
  minLength?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxLength?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

