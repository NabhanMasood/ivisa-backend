import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateCountryDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Country name cannot be empty' })
  countryName?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;
}