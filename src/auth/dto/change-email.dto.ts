import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class ChangeEmailDto {
  @IsEmail({}, { message: 'New email must be a valid email address' })
  @IsNotEmpty({ message: 'New email is required' })
  newEmail: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required to change email' })
  password: string;
}

