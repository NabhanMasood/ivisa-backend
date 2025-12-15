import { IsString, IsNotEmpty, IsIn, IsDateString, IsNumber, Min, IsOptional } from 'class-validator';

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsIn(['percent', 'amount'])
  type: 'percent' | 'amount';

  @IsNumber()
  @Min(0)
  value: number; // For 'percent': percentage value (e.g., 10 for 10%), For 'amount': fixed discount amount

  @IsDateString()
  validity: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  usageLimit?: number | null; // null or undefined = unlimited usage

  @IsString()
  @IsOptional()
  @IsIn(['enable', 'disable'])
  status?: 'enable' | 'disable';
}


