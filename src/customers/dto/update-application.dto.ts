import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn } from 'class-validator';

export class UpdateApplicationDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Application number cannot be empty' })
  applicationNumber?: string;

  @IsNumber()
  @IsOptional()
  customerId?: number;

  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Destination cannot be empty' })
  destination?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Visa product cannot be empty' })
  visaProduct?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  @IsIn(['Pending', 'In Review', 'Approved', 'Rejected'], {
    message: 'Status must be Pending, In Review, Approved, or Rejected',
  })
  status?: string;
}

