import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class UpdateAppSettingsDto {
  @IsString()
  @IsNotEmpty()
  value: string;
}

