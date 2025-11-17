import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { FieldType } from '../entities/visa-product-field.entity';

export class CreateVisaProductFieldDto {
  @IsNumber()
  @IsNotEmpty({ message: 'Visa Product ID is required' })
  visaProductId: number;

  @IsEnum(FieldType, { message: 'Invalid field type' })
  @IsNotEmpty({ message: 'Field type is required' })
  fieldType: FieldType;

  @IsString()
  @IsNotEmpty({ message: 'Question is required' })
  question: string;

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

