import { IsEmail, IsString, MinLength, IsObject, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class PermissionsDto {
  @IsBoolean()
  countries: boolean;

  @IsBoolean()
  visaProducts: boolean;

  @IsBoolean()
  nationalities: boolean;

  @IsBoolean()
  embassies: boolean;

  @IsBoolean()
  coupons: boolean;

  @IsBoolean()
  additionalInfo: boolean;

  @IsBoolean()
  customers: boolean;

  @IsBoolean()
  applications: boolean;

  @IsBoolean()
  finances: boolean;
}

export class CreateSubadminDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PermissionsDto)
  permissions: PermissionsDto;
}

