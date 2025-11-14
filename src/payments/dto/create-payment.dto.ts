import {
    IsString,
    IsNotEmpty,
    IsNumber,
    Min,
    IsOptional,
    IsIn,
  } from 'class-validator';
  
  export class CreatePaymentDto {
    @IsNumber()
    @IsNotEmpty({ message: 'Application ID is required' })
    applicationId: number;
  
    @IsNumber()
    @Min(0, { message: 'Amount must be greater than 0' })
    amount: number;
  
    @IsString()
    @IsOptional()
    @IsIn(['PKR', 'USD', 'EUR', 'GBP'], {
      message: 'Currency must be PKR, USD, EUR, or GBP',
    })
    currency?: string;
  
    @IsString()
    @IsNotEmpty({ message: 'Payment method is required' })
    @IsIn(['card', 'bank_transfer', 'wallet'], {
      message: 'Payment method must be card, bank_transfer, or wallet',
    })
    paymentMethod: string;
  
    @IsString()
    @IsOptional()
    paymentGateway?: string; // stripe, paypal, razorpay
  
    @IsString()
    @IsOptional()
    notes?: string;
  }