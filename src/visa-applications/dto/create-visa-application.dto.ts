import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  Matches,
  IsIn,
} from 'class-validator';

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
    message: 'Visa type must be in format: {validity}-{entryType} (e.g., 60-single, 90-multiple, 180-single)',
  })
  @IsIn(['180-single', '180-multiple', '90-single'], {
    message: 'Visa type must be 180-single, 180-multiple, or 90-single',
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
}
