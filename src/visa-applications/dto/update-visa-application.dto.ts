import {
  IsString,
  IsNumber,
  Min,
  IsOptional,
  IsIn,
  Matches,
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
}
