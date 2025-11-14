import { IsNotEmpty, IsString, IsEmail } from 'class-validator';

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
}

