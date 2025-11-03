import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateEmbassyDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Destination country cannot be empty' })
  destinationCountry?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Origin country cannot be empty' })
  originCountry?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Embassy name cannot be empty' })
  embassyName?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Address cannot be empty' })
  address?: string;
}

