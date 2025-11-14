import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateCountryDto {
  @IsString()
  @IsNotEmpty({ message: 'Country name is required' })
  countryName: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;
}