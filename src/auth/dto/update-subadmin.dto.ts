import { IsObject, ValidateNested, IsOptional, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PermissionsDto } from './create-subadmin.dto';

export class UpdateSubadminDto {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PermissionsDto)
  permissions?: PermissionsDto;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

