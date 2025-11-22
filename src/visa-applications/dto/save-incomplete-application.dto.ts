import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class SaveIncompleteApplicationDto {
  @IsEmail()
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsNumber()
  @IsOptional()
  customerId?: number;

  @IsNumber()
  @IsOptional()
  visaProductId?: number;

  @IsString()
  @IsOptional()
  nationality?: string;

  @IsString()
  @IsOptional()
  destinationCountry?: string;

  @IsString()
  @IsOptional()
  visaType?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  numberOfTravelers?: number;
}

