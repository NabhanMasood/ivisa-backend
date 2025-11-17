import { IsString, IsOptional, IsIn, IsDateString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class UpdateCouponDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Code cannot be empty' })
  code?: string;

  @IsString()
  @IsOptional()
  @IsIn(['percent', 'amount'])
  type?: 'percent' | 'amount';

  @IsNumber()
  @IsOptional()
  @Min(0)
  value?: number; // For 'percent': percentage value (e.g., 10 for 10%), For 'amount': fixed discount amount

  @IsDateString()
  @IsOptional()
  validity?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  usageLimit?: number | null; // null = unlimited usage

  @IsString()
  @IsOptional()
  @IsIn(['enable', 'disable'])
  status?: 'enable' | 'disable';
}

