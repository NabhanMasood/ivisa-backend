
import { IsString, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';

export class SelectProcessingDto {
  @IsString()
  @IsNotEmpty({ message: 'Processing type is required' })
  processingType: string;

  @IsNumber()
  @Min(0, { message: 'Processing fee must be a positive number' })
  processingFee: number;

  @IsNumber()
  @IsOptional()
  processingFeeId?: number; // ID from processing_fees table
}
