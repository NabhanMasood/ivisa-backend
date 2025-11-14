import {
    IsArray,
    IsNotEmpty,
    IsNumber,
    ValidateNested,
    ArrayMinSize,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  
  class TravelerDataDto {
    @IsNotEmpty()
    firstName: string;
  
    @IsNotEmpty()
    lastName: string;
  
    @IsNotEmpty()
    email: string;
  
  
    @IsNotEmpty()
    dateOfBirth: string;
  
  
    // Passport details (optional)
    passportNationality?: string;
    passportNumber?: string;
    passportExpiryDate?: string;
    residenceCountry?: string;
    hasSchengenVisa?: boolean;
    placeOfBirth?: string;
    notes?: string;
  }
  
  export class BulkCreateTravelersDto {
    @IsNumber()
    @IsNotEmpty({ message: 'Application ID is required' })
    applicationId: number;
  
    @IsArray({ message: 'Travelers must be an array' })
    @ArrayMinSize(1, { message: 'At least one traveler is required' })
    @ValidateNested({ each: true })
    @Type(() => TravelerDataDto)
    travelers: TravelerDataDto[];
  }