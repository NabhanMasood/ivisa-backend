import { IsNumber, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PaymentIntentDto {
  @IsNumber()
  @IsNotEmpty({ message: 'Application ID is required' })
  applicationId: number;

  @IsNumber()
  @IsNotEmpty({ message: 'Amount is required' })
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string; // Default: USD

  @IsString()
  @IsOptional()
  paymentMethod?: string; // card, bank_transfer

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  metadata?: Record<string, any>; // Additional data for payment gateway
}