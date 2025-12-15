import { IsArray, IsNumber, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class BatchGetFieldsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one visa product ID is required' })
  @IsNumber({}, { each: true })
  @Type(() => Number)
  visaProductIds: number[];
}

