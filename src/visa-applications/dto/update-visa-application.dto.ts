import {
  IsString,
  IsNumber,
  Min,
  IsOptional,
  IsIn,
  Matches,
  IsEmail,
  IsArray,
  ValidateNested,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

// Nested DTO for travelers in draft updates
export class DraftTravelerDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

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
}

export class UpdateVisaApplicationDto {
  @IsString()
  @IsOptional()
  nationality?: string;

  @IsString()
  @IsOptional()
  destinationCountry?: string;

  @IsNumber()
  @IsOptional()
  embassyId?: number;

  @IsString()
  @IsOptional()
  @Matches(/^\d+-(single|multiple)$/, {
    message: 'Visa type must be in format: {validity}-{entryType} (e.g., 60-single, 90-multiple, 180-single)',
  })
  visaType?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  numberOfTravelers?: number;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsNumber()
  @IsOptional()
  visaProductId?: number;

  @IsString()
  @IsOptional()
  @IsIn([
    'draft',
    'submitted',
    'resubmission',
    'Additional Info required',
    'processing',
    'under_review',
    'approved',
    'rejected',
    'cancelled',
    'completed',
    // Kanban column values (will be mapped to actual statuses)
    'pending',
    'in_process',
  ])
  status?: string;

  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @IsString()
  @IsOptional()
  notes?: string;

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

  // Individual step data (alternative to draftData)
  @IsOptional()
  step1Data?: any; // Step 1 data

  @IsOptional()
  step2Data?: any; // Step 2 data

  @IsOptional()
  step3Data?: any; // Step 3 data

  @IsOptional()
  step4Data?: any; // Step 4 data

  @IsOptional()
  step5Data?: any; // Step 5 data
}
