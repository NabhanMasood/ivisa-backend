import { IsOptional, IsString, IsNumber, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateNationalityDto {
  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  govtFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  serviceFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFreeVisa?: boolean;
}

