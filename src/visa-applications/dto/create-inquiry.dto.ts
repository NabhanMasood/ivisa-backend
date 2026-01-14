import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  MaxLength,
} from 'class-validator';

export class CreateInquiryDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(255, { message: 'Name must be at most 255 characters' })
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsOptional()
  @MaxLength(20, { message: 'Phone number must be at most 20 characters' })
  phone?: string;

  @IsString()
  @IsNotEmpty({ message: 'Subject is required' })
  @MaxLength(255, { message: 'Subject must be at most 255 characters' })
  subject: string;

  @IsString()
  @IsNotEmpty({ message: 'Nationality is required' })
  nationality: string;

  @IsString()
  @IsNotEmpty({ message: 'Travelling from country is required' })
  @MaxLength(100, { message: 'Travelling from must be at most 100 characters' })
  travellingFrom: string;

  @IsString()
  @IsNotEmpty({ message: 'Destination country is required' })
  destinationCountry: string;

  @IsString()
  @IsNotEmpty({ message: 'Message is required' })
  message: string;
}
