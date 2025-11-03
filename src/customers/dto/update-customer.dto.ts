import { IsString, IsNotEmpty, IsOptional, IsEmail, IsIn } from 'class-validator';

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
  @IsNotEmpty({ message: 'Phone cannot be empty' })
  phone?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Residence country cannot be empty' })
  residenceCountry?: string;

  @IsString()
  @IsOptional()
  @IsIn(['Active', 'Inactive', 'Suspended'], { message: 'Status must be Active, Inactive, or Suspended' })
  status?: string; // Active, Inactive, Suspended
}

