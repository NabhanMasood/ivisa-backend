import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsEmail,
  IsDateString,
  IsBoolean,
  IsOptional,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Traveler with passport data combined
class CompleteTravelerDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail({}, { message: 'Please provide a valid email' })
  @IsOptional()
  email?: string;

  @IsDateString()
  @IsNotEmpty()
  dateOfBirth: string;

  // Passport details
  @IsString()
  @IsNotEmpty()
  passportNationality: string;

  @IsString()
  @IsNotEmpty()
  passportNumber: string;

  @IsDateString()
  @IsNotEmpty()
  passportExpiryDate: string;

  @IsString()
  @IsNotEmpty()
  residenceCountry: string;

  @IsBoolean()
  @IsNotEmpty()
  hasSchengenVisa: boolean;

  @IsString()
  @IsOptional()
  placeOfBirth?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    // Handle both boolean and string representations
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  receiveUpdates?: boolean;
}

// Payment data
class CompletePaymentDto {
  @IsNumber()
  @IsOptional()
  cardInfoId?: number; // ID of saved card if using a saved card

  @IsString()
  @IsOptional()
  cardholderName?: string; // Required if not using saved card

  @IsString()
  @IsOptional()
  cardLast4?: string;

  @IsString()
  @IsOptional()
  cardBrand?: string;

  @IsString()
  @IsOptional()
  expiryMonth?: string; // For saving new card

  @IsString()
  @IsOptional()
  expiryYear?: string; // For saving new card

  @IsString()
  @IsOptional()
  paymentMethodId?: string; // Stripe payment method ID

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsString()
  @IsOptional()
  paymentIntentId?: string;

  @IsString()
  @IsOptional()
  paymentGateway?: string;

  @IsBoolean()
  @IsOptional()
  saveCard?: boolean; // Whether to save this card for future use
}

export class SubmitCompleteApplicationDto {
  // Trip Info (Step 1)
  @IsNumber()
  @IsOptional()
  customerId?: number;

  @IsNumber()
  @IsNotEmpty({ message: 'Visa Product ID is required' })
  visaProductId: number;

  @IsString()
  @IsNotEmpty({ message: 'Nationality is required' })
  nationality: string;

  @IsString()
  @IsNotEmpty({ message: 'Destination country is required' })
  destinationCountry: string;

  @IsNumber()
  @IsOptional()
  embassyId?: number; // Optional embassy selection

  @IsString()
  @IsNotEmpty({ message: 'Visa type is required' })
  @Matches(/^\d+-(single|multiple)$/, {
    message: 'Visa type must be in format: {validity}-{entryType} (e.g., 60-single, 90-multiple, 180-single)',
  })
  visaType: string;

  @IsNumber()
  @Min(1)
  numberOfTravelers: number;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one traveler is required' })
  @ValidateNested({ each: true })
  @Type(() => CompleteTravelerDto)
  travelers: CompleteTravelerDto[];

  // Processing selection (Step 4) - FIXED: Accept any string
  @IsString()
  @IsNotEmpty({ message: 'Processing type is required' })
  // ❌ REMOVED: @IsIn(['standard', 'rush', 'super-rush'])
  processingType: string;

  @IsString()
  @IsOptional()
  processingTime?: string; // e.g., "5 days", "24 hours"

  @IsNumber()
  @Min(0)
  processingFee: number;

  @IsNumber()
  @IsOptional()
  processingFeeId?: number; // ID from processing_fees table

  // Fees
  @IsNumber()
  @Min(0)
  govtFee: number;

  @IsNumber()
  @Min(0)
  serviceFee: number;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  discountAmount?: number;

  @IsString()
  @IsOptional()
  couponCode?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  paymentStatus?: string;

  @ValidateNested()
  @Type(() => CompletePaymentDto)
  payment: CompletePaymentDto;

  // Optional
  @IsString()
  @IsOptional()
  notes?: string;
}
