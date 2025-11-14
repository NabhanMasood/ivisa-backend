import {
    IsString,
    IsEmail,
    IsDateString,
    IsIn,
    IsOptional,
    IsBoolean,
  } from 'class-validator';
  
  export class UpdateTravelerDto {
    // Personal Information
    @IsString()
    @IsOptional()
    firstName?: string;
  
    @IsString()
    @IsOptional()
    lastName?: string;
  
    @IsEmail()
    @IsOptional()
    email?: string;

  
    @IsDateString()
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