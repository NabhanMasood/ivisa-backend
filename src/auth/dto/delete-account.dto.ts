import { IsString, IsNotEmpty } from 'class-validator';

export class DeleteAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'Password is required to delete account' })
  password: string;
}

