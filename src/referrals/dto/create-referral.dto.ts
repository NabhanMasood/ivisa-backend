import { IsEmail, IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateReferralDto {
    @Transform(({ obj }) => {
        // Accept email from any of these field names
        return obj.referredEmail || obj.email || obj.referred_email;
    })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty({ message: 'Email address is required' })
    referredEmail: string;
}

