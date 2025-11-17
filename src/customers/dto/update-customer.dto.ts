import { IsString, IsNotEmpty, IsOptional, IsEmail, IsIn, IsDateString, IsBoolean } from 'class-validator';

export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Full name cannot be empty' })
  fullname?: string;

  @IsEmail()
  @IsOptional()
  @IsNotEmpty({ message: 'Email cannot be empty' })
  email?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Residence country cannot be empty' })
  residenceCountry?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  nationality?: string;

  @IsString()
  @IsOptional()
  passportNumber?: string;

  @IsString()
  @IsOptional()
  passportNationality?: string;

  @IsDateString()
  @IsOptional()
  passportExpiryDate?: string | Date;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string | Date;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  @IsIn(['Active', 'Inactive', 'Suspended'], { message: 'Status must be Active, Inactive, or Suspended' })
  status?: string; // Active, Inactive, Suspended

  @IsBoolean()
  @IsOptional()
  hasSchengenVisa?: boolean;
}

