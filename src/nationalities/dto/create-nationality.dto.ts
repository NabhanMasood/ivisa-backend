import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateNationalityDto {
  @IsString()
  @IsNotEmpty()
  nationality: string;

  @IsString()
  @IsNotEmpty()
  destination: string;

  @IsString()
  @IsNotEmpty()
  productName: string;

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
