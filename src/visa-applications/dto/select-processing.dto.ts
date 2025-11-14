import { IsString, IsNotEmpty, IsNumber, Min, IsIn } from 'class-validator';

export class SelectProcessingDto {
  @IsString()
  @IsNotEmpty({ message: 'Processing type is required' })
  @IsIn(['standard', 'rush', 'super-rush'], {
    message: 'Processing type must be standard, rush, or super-rush',
  })
  processingType: string;

  @IsNumber()
  @Min(0, { message: 'Processing fee must be a positive number' })
  processingFee: number; // 5320 for standard/rush, 15320 for super-rush
}