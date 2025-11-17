import { IsString, IsNotEmpty, IsNumber, Min, IsIn } from 'class-validator';

export class ProcessingFeeDto {
  @IsString()
  @IsNotEmpty()
  feeType: string;

  @IsNumber()
  @Min(1)
  timeValue: number;

  @IsString()
  @IsIn(['hours', 'days'])
  timeUnit: string;

  @IsNumber()
  @Min(0)
  amount: number;
}