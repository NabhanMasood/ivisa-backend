import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsEmail,
  IsArray,
  ValidateNested,
  IsBoolean,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ManualTravelerDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @IsString()
  @IsNotEmpty({ message: 'Date of birth is required' })
  dateOfBirth: string; // Format: YYYY-MM-DD

  @IsString()
  @IsOptional()
  passportNumber?: string;

  @IsString()
  @IsOptional()
  passportExpiryDate?: string; // Format: YYYY-MM-DD

  @IsString()
  @IsOptional()
  residenceCountry?: string;

  @IsBoolean()
  @IsOptional()
  hasSchengenVisa?: boolean;
}

export class CustomerSelectionDto {
  @IsNumber()
  @IsOptional()
  customerId?: number; // Existing customer ID

  // New customer details (used when customerId is not provided)
  @IsString()
  @IsOptional()
  fullname?: string;

  @IsEmail({}, { message: 'Please provide a valid email' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

export class CreateManualApplicationDto {
  @IsString()
  @IsNotEmpty({ message: 'Nationality is required' })
  nationality: string;

  @IsString()
  @IsNotEmpty({ message: 'Destination country is required' })
  destinationCountry: string;

  @IsNumber()
  @IsNotEmpty({ message: 'Visa Product ID is required' })
  visaProductId: number;

  @IsString()
  @IsNotEmpty({ message: 'Visa type is required' })
  visaType: string; // e.g., "90-single"

  @IsNumber()
  @Min(1, { message: 'Number of travelers must be at least 1' })
  @Max(10, { message: 'Number of travelers cannot exceed 10' })
  numberOfTravelers: number;

  @IsEmail({}, { message: 'Please provide a valid email' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ValidateNested()
  @Type(() => CustomerSelectionDto)
  @IsNotEmpty()
  customer: CustomerSelectionDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualTravelerDto)
  travelers: ManualTravelerDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}
