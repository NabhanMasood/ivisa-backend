import {
  IsString,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';

export class UpdateCardInfoDto {
  @IsString()
  @IsOptional()
  cardholderName?: string;

  @IsString()
  @IsOptional()
  cardLast4?: string;

  @IsString()
  @IsOptional()
  cardBrand?: string;

  @IsString()
  @IsOptional()
  @Matches(/^(0[1-9]|1[0-2])$/, {
    message: 'Expiry month must be between 01 and 12',
  })
  expiryMonth?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}$/, {
    message: 'Expiry year must be 4 digits',
  })
  expiryYear?: string;

  @IsString()
  @IsOptional()
  paymentMethodId?: string;

  @IsString()
  @IsOptional()
  paymentGateway?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

