import { IsArray, IsNumber, ValidateNested, ArrayMinSize, IsString, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class BatchFieldItemDto {
    @IsNumber()
    @Type(() => Number)
    @IsOptional()
    id?: number; // If present, update existing field; if not, create new field

    @IsString()
    question: string;

    @IsNumber()
    @Type(() => Number)
    displayOrder: number;

    @IsString()
    fieldType: string;

    @IsNumber()
    @Type(() => Number)
    @IsOptional()
    visaProductId?: number;

    @IsBoolean()
    @IsOptional()
    isRequired?: boolean;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsString()
    @IsOptional()
    placeholder?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    options?: string[];

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    allowedFileTypes?: string[];

    @IsNumber()
    @Type(() => Number)
    @IsOptional()
    maxFileSizeMB?: number;

    @IsNumber()
    @Type(() => Number)
    @IsOptional()
    minLength?: number;

    @IsNumber()
    @Type(() => Number)
    @IsOptional()
    maxLength?: number;
}

export class BatchSaveFieldsDto {
    @IsNumber()
    @Type(() => Number)
    visaProductId: number;

    @IsArray()
    @ArrayMinSize(1, { message: 'At least one field is required' })
    @ValidateNested({ each: true })
    @Type(() => BatchFieldItemDto)
    fields: BatchFieldItemDto[];
}

