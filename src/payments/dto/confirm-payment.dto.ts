import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsNumber,
  } from 'class-validator';
  
  export class ConfirmPaymentDto {
    @IsNumber()
    @IsNotEmpty({ message: 'Application ID is required' })
    applicationId: number;
  
    @IsString()
    @IsNotEmpty({ message: 'Cardholder name is required' })
    cardholderName: string;
  
    @IsString()
    @IsOptional()
    cardLast4?: string; // Last 4 digits
  
    @IsString()
    @IsOptional()
    cardBrand?: string; // visa, mastercard, amex
  
    @IsString()
    @IsOptional()
    transactionId?: string; // From payment gateway
  
    @IsString()
    @IsOptional()
    paymentIntentId?: string; // Stripe payment intent ID
  
    @IsString()
    @IsOptional()
    paymentGateway?: string; // stripe, paypal, etc.
  
    @IsOptional()
    metadata?: Record<string, any>; // Additional payment data
  }