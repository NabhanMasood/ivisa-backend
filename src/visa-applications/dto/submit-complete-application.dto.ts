import {
    IsString,
    IsNotEmpty,
    IsNumber,
    Min,
    IsIn,
    IsArray,
    ValidateNested,
    ArrayMinSize,
    IsEmail,
    IsDateString,
    IsBoolean,
    IsOptional,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  
  // Traveler with passport data combined
  class CompleteTravelerDto {
    @IsString()
    @IsNotEmpty()
    firstName: string;
  
    @IsString()
    @IsNotEmpty()
    lastName: string;
  
    @IsEmail()
    @IsNotEmpty()
    email: string;
  

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
  }
  
  // Payment data
  class CompletePaymentDto {
    @IsString()
    @IsNotEmpty()
    cardholderName: string;
  
    @IsString()
    @IsOptional()
    cardLast4?: string;
  
    @IsString()
    @IsOptional()
    cardBrand?: string;
  
    @IsString()
    @IsOptional()
    transactionId?: string;
  
    @IsString()
    @IsOptional()
    paymentIntentId?: string;
  
    @IsString()
    @IsOptional()
    paymentGateway?: string;
  }
  
  export class SubmitCompleteApplicationDto {
    // Trip Info (Step 1)
    @IsNumber()
    @IsOptional()
    customerId?: number; // Optional - will be created from first traveler if not provided
  
    @IsNumber()
    @IsNotEmpty({ message: 'Visa Product ID is required' })
    visaProductId: number;
  
    @IsString()
    @IsNotEmpty({ message: 'Nationality is required' })
    nationality: string;
  
    @IsString()
    @IsNotEmpty({ message: 'Destination country is required' })
    destinationCountry: string;
  
    @IsString()
    @IsNotEmpty({ message: 'Visa type is required' })
    @IsIn(['180-single', '180-multiple', '90-single'])
    visaType: string;
  
    @IsNumber()
    @Min(1)
    numberOfTravelers: number;
  
    // Travelers with passport data (Step 2 & 3)
    @IsArray()
    @ArrayMinSize(1, { message: 'At least one traveler is required' })
    @ValidateNested({ each: true })
    @Type(() => CompleteTravelerDto)
    travelers: CompleteTravelerDto[];
  
    // Processing selection (Step 4)
    @IsString()
    @IsNotEmpty({ message: 'Processing type is required' })
    @IsIn(['standard', 'rush', 'super-rush'])
    processingType: string;
  
    @IsNumber()
    @Min(0)
    processingFee: number;
  
    // Payment data (Step 5)
    @ValidateNested()
    @Type(() => CompletePaymentDto)
    payment: CompletePaymentDto;
  
    // Optional
    @IsString()
    @IsOptional()
    notes?: string;
  }