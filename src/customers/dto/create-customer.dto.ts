import { IsNotEmpty, IsString, IsEmail, IsOptional, IsDateString, IsBoolean } from 'class-validator';
export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  fullname: string;

  @IsEmail()
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
  @IsString()
  @IsNotEmpty({ message: 'Residence country is required' })
  residenceCountry: string;

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

  @IsBoolean()
  @IsOptional()
  hasSchengenVisa?: boolean;
}

