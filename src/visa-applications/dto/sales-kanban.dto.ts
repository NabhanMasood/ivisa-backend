import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UpdateSalesStatusDto {
  @IsString()
  @IsNotEmpty({ message: 'Sales status is required' })
  @IsIn(['new_lead', 'contacted', 'follow_up', 'converted', 'lost'])
  salesStatus: string;

  @IsString()
  @IsOptional()
  salesNotes?: string;
}

export class SalesKanbanQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  destination?: string;

  @IsString()
  @IsOptional()
  visaType?: string;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  reminderSent?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  couponSent?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  minAmount?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  maxAmount?: number;

  @IsString()
  @IsOptional()
  @IsIn(['new_lead', 'contacted', 'follow_up', 'converted', 'lost'])
  salesStatus?: string;
}

export class SendCustomEmailDto {
  @IsNumber()
  @IsNotEmpty({ message: 'Application ID is required' })
  @Type(() => Number)
  applicationId: number;

  @IsString()
  @IsNotEmpty({ message: 'Subject is required' })
  subject: string;

  @IsString()
  @IsNotEmpty({ message: 'Email body is required' })
  body: string;
}

export class SendTemplateEmailDto {
  @IsNumber()
  @IsNotEmpty({ message: 'Application ID is required' })
  @Type(() => Number)
  applicationId: number;

  @IsString()
  @IsNotEmpty({ message: 'Template type is required' })
  @IsIn(['reminder', 'coupon', 'help_offer'])
  templateType: string;

  @IsString()
  @IsOptional()
  couponCode?: string;
}
