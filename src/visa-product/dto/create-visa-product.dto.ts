import { IsString, IsNotEmpty, IsNumber, Min, IsArray, ValidateNested, IsOptional, IsIn, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { ProcessingFeeDto } from './processing-fee.dto';

export class CreateVisaProductDto {
  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  productName: string;

  @IsNumber()
  @Min(1)
  duration: number;

  @IsNumber()
  @Min(1)
  validity: number;

  @IsString()
  @IsNotEmpty()
  @IsIn(['single', 'multiple', 'custom'], {
    message: 'entryType must be one of: single, multiple, or custom',
  })
  entryType: string;

  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => o.entryType === 'custom')
  customEntryName?: string;

  @IsNumber()
  @Min(0)
  govtFee: number;

  @IsNumber()
  @Min(0)
  serviceFee: number;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProcessingFeeDto)
  processingFees?: ProcessingFeeDto[];
}
