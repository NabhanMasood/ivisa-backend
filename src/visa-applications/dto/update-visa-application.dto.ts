import {
    IsString,
    IsNumber,
    Min,
    IsOptional,
    IsIn,
  } from 'class-validator';
  
  export class UpdateVisaApplicationDto {
    @IsString()
    @IsOptional()
    nationality?: string;
  
    @IsString()
    @IsOptional()
    destinationCountry?: string;
  
    @IsString()
    @IsOptional()
    @IsIn(['180-single', '180-multiple', '90-single'], {
      message: 'Visa type must be 180-single, 180-multiple, or 90-single',
    })
    visaType?: string;
  
    @IsNumber()
    @Min(1)
    @IsOptional()
    numberOfTravelers?: number;
  
    @IsNumber()
    @IsOptional()
    visaProductId?: number;
  
    @IsString()
    @IsOptional()
    @IsIn([
      'draft',
      'submitted',
      'processing',
      'under_review',
      'approved',
      'rejected',
      'cancelled',
    ])
    status?: string;
  
    @IsString()
    @IsOptional()
    rejectionReason?: string;
  
    @IsString()
    @IsOptional()
    notes?: string;
  }