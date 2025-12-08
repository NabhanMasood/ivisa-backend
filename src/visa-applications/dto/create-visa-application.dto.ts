import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  Matches,
  IsIn,
  IsEmail,
  IsArray,
  ValidateNested,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

// Nested DTO for travelers in draft
export class DraftTravelerDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @IsEmail({}, { message: 'Please provide a valid email' })
  @IsOptional()
  email?: string;

  @IsDateString({}, { message: 'Date of birth must be a valid date' })
  @IsOptional()
  dateOfBirth?: string;

  // Passport Details
  @IsString()
  @IsOptional()
  passportNationality?: string;

  @IsString()
  @IsOptional()
  passportNumber?: string;

  @IsDateString()
  @IsOptional()
  passportExpiryDate?: string;

  @IsString()
  @IsOptional()
  residenceCountry?: string;

  @IsBoolean()
  @IsOptional()
  hasSchengenVisa?: boolean;

  @IsString()
  @IsOptional()
  placeOfBirth?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  // Flag to indicate if passport details should be added later
  @IsBoolean()
  @IsOptional()
  addPassportDetailsLater?: boolean;
}

export class CreateVisaApplicationDto {
  @IsNumber()
  @IsNotEmpty({ message: 'Customer ID is required' })
  customerId: number;

  @IsNumber()
  @IsNotEmpty({ message: 'Visa Product ID is required' })
  visaProductId: number;

  @IsString()
  @IsNotEmpty({ message: 'Nationality is required' })
  nationality: string; // e.g., "Pakistan"

  @IsString()
  @IsNotEmpty({ message: 'Destination country is required' })
  destinationCountry: string; // e.g., "Morocco"

  @IsNumber()
  @IsOptional()
  embassyId?: number; // Optional embassy selection

  @IsString()
  @IsNotEmpty({ message: 'Visa type is required' })
  @Matches(/^\d+-(single|multiple)$/, {
    message: 'Visa type must be in format: {validity}-{entryType} (e.g., 30-single, 60-single, 90-multiple, 180-single)',
  })
  visaType: string;

  @IsNumber()
  @Min(1, { message: 'Number of travelers must be at least 1' })
  numberOfTravelers: number;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  governmentFee?: number; // Will be calculated if not provided

  @IsNumber()
  @Min(0)
  @IsOptional()
  serviceFee?: number; // Will be calculated if not provided

  @IsString()
  @IsOptional()
  notes?: string; // Optional internal notes

  @IsEmail({}, { message: 'Please provide a valid email' })
  @IsOptional()
  email?: string; // Email captured on first step for pending reminders

  // Travelers data (Step 2 & 3) - for saving to draft
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DraftTravelerDto)
  @IsOptional()
  travelers?: DraftTravelerDto[];

  // Processing selection (Step 5) - for saving to draft
  @IsString()
  @IsOptional()
  processingType?: string;

  @IsString()
  @IsOptional()
  processingTime?: string; // e.g., "5 days", "24 hours"

  @IsNumber()
  @Min(0)
  @IsOptional()
  processingFee?: number;

  @IsNumber()
  @IsOptional()
  processingFeeId?: number; // ID from processing_fees table

  // Step-by-step draft data
  @IsOptional()
  draftData?: {
    step1?: any;
    step2?: any;
    step3?: any;
    step4?: any;
    step5?: any;
    currentStep?: number;
  };

  @IsNumber()
  @IsOptional()
  currentStep?: number; // Current step (1-6)
}
