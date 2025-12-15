import { IsNotEmpty, IsString } from 'class-validator';

export class CreateEmbassyDto {
  @IsString()
  @IsNotEmpty({ message: 'Destination country is required' })
  destinationCountry: string;

  @IsString()
  @IsNotEmpty({ message: 'Origin country is required' })
  originCountry: string;

  @IsString()
  @IsNotEmpty({ message: 'Embassy name is required' })
  embassyName: string;

  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  address: string;
}

