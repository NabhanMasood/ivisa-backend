import {
    IsString,
    IsNotEmpty,
    IsDateString,
    IsBoolean,
    IsOptional,
  } from 'class-validator';
  
  export class UpdatePassportDto {
    @IsString()
    @IsNotEmpty({ message: 'Passport nationality is required' })
    passportNationality: string;
  
    @IsString()
    @IsNotEmpty({ message: 'Passport number is required' })
    passportNumber: string;
  
    @IsDateString({}, { message: 'Passport expiry date must be a valid date' })
    @IsNotEmpty({ message: 'Passport expiry date is required' })
    passportExpiryDate: string;
  
    @IsString()
    @IsNotEmpty({ message: 'Residence country is required' })
    residenceCountry: string;
  
    @IsBoolean({ message: 'Schengen visa status must be true or false' })
    @IsNotEmpty({ message: 'Schengen visa status is required' })
    hasSchengenVisa: boolean;
  
    // Optional fields
    @IsString()
    @IsOptional()
    passportIssuePlace?: string;
  
    @IsDateString()
    @IsOptional()
    passportIssueDate?: string;
  
    @IsString()
    @IsOptional()
    placeOfBirth?: string;
  }