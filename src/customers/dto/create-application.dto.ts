import { IsNotEmpty, IsString, IsNumber, IsOptional, IsIn } from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty({ message: 'Application number is required' })
  applicationNumber: string;

  @IsNumber()
  @IsNotEmpty({ message: 'Customer ID is required' })
  customerId: number;

  @IsString()
  @IsNotEmpty({ message: 'Destination is required' })
  destination: string;

  @IsString()
  @IsNotEmpty({ message: 'Visa product is required' })
  visaProduct: string;

  @IsNumber()
  @IsNotEmpty({ message: 'Price is required' })
  price: number;

  @IsString()
  @IsOptional()
  @IsIn(['Pending', 'In Review', 'Approved', 'Rejected'], {
    message: 'Status must be Pending, In Review, Approved, or Rejected',
  })
  status?: string;
}