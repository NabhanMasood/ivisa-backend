import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateVisaProductDto {
    @IsString()
    @IsNotEmpty()
    country: string;

    @IsString()
    @IsNotEmpty()
    productName: string;

    @IsNumber()
    @Min(1)
    duration: number;

    @IsNumber()
    @Min(1)
    validity: number;

    @IsNumber()
    @Min(0)
    govtFee: number;

    @IsNumber()
    @Min(0)
    serviceFee: number;

    @IsNumber()
    @Min(0)
    totalAmount: number;
}
