import { IsNotEmpty, IsOptional, IsString, IsNumber, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminCustomFieldDto {
  @IsString()
  @IsNotEmpty()
  fieldType: 'text' | 'number' | 'date' | 'dropdown' | 'upload';

  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsOptional()
  placeholder?: string;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  // For dropdown
  @IsArray()
  @IsOptional()
  options?: string[];

  // For upload
  @IsArray()
  @IsOptional()
  allowedFileTypes?: string[];

  @IsNumber()
  @IsOptional()
  maxFileSizeMB?: number;

  // For text/number length constraints
  @IsNumber()
  @IsOptional()
  minLength?: number;

  @IsNumber()
  @IsOptional()
  maxLength?: number;

  // Targeting
  @IsNumber()
  @IsOptional()
  travelerId?: number; // If set, this field is for a specific traveler
}

export class RequestResubmissionDto {
  @IsNumber()
  @IsOptional()
  travelerId?: number; // If provided, request resubmission for this traveler; otherwise application-level

  @IsString()
  @IsNotEmpty({ message: 'Note is required to inform the customer what to fix' })
  note: string;

  // Product field IDs that must be edited/re-uploaded in this resubmission
  @IsArray()
  @IsOptional()
  @Type(() => Number)
  requestedFieldIds?: number[];

  // Admin-defined ad-hoc fields (per application or specific traveler) visible only to this client
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AdminCustomFieldDto)
  customFields?: AdminCustomFieldDto[];
}


