import { IsNumber, Min } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsNumber(
    {},
    { message: 'Amount must be a number (in cents, e.g., 5000 for $50)' },
  )
  @Min(1, { message: 'Amount must be at least 1 cent' })
  amount: number;
}
