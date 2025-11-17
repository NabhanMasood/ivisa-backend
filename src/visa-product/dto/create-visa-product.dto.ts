import { IsString, IsNotEmpty, IsNumber, Min, IsArray, ValidateNested, IsOptional } from 'class-validator';
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
  entryType: string;

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
