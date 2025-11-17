import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsDateString,
  IsIn,
  IsOptional,
  IsNumber,
} from 'class-validator';

export class CreateTravelerDto {
  @IsNumber()
  @IsNotEmpty({ message: 'Application ID is required' })
  applicationId: number;

  // Personal Information
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @IsEmail({}, { message: 'Please provide a valid email' })
  @IsOptional() // Make email optional
  email?: string; // Make it optional with ?

  @IsDateString({}, { message: 'Date of birth must be a valid date' })
  @IsNotEmpty({ message: 'Date of birth is required' })
  dateOfBirth: string;

  // Passport Details (Optional at creation, can be added later)
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

  @IsOptional()
  hasSchengenVisa?: boolean;

  @IsString()
  @IsOptional()
  placeOfBirth?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
