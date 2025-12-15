import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';

export class CreateCardInfoDto {
  @IsNumber()
  @IsNotEmpty({ message: 'Customer ID is required' })
  customerId: number;

  @IsString()
  @IsNotEmpty({ message: 'Cardholder name is required' })
  cardholderName: string;

  @IsString()
  @IsOptional()
  cardLast4?: string; // Last 4 digits of card

  @IsString()
  @IsOptional()
  cardBrand?: string; // visa, mastercard, amex, etc.

  @IsString()
  @IsOptional()
  @Matches(/^(0[1-9]|1[0-2])$/, {
    message: 'Expiry month must be between 01 and 12',
  })
  expiryMonth?: string; // e.g., "12"

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}$/, {
    message: 'Expiry year must be 4 digits',
  })
  expiryYear?: string; // e.g., "2025"

  @IsString()
  @IsOptional()
  paymentMethodId?: string; // Stripe payment method ID or similar

  @IsString()
  @IsOptional()
  paymentGateway?: string; // stripe, paypal, razorpay, etc.

  @IsBoolean()
  @IsOptional()
  isActive?: boolean; // Whether this card is active

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean; // Whether this is the default card
}

