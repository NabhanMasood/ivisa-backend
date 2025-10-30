import { NationalitiesService } from './nationalities.service';
import { CreateNationalityDto } from './dto/create-nationality.dto';
export declare class NationalitiesController {
    private readonly service;
    constructor(service: NationalitiesService);
    create(dto: CreateNationalityDto): Promise<{
        status: boolean;
        message: string;
        data: import("./entities/nationality.entity").Nationality;
    }>;
    nationalityDropdown(): Promise<{
        status: boolean;
        data: string[];
    }>;
    destinationDropdown(): Promise<{
        status: boolean;
        data: any[];
    }>;
    products(destination: string): Promise<{
        status: boolean;
        message: string;
        data: {
            productName: string;
            duration: number;
            validity: number;
            govtFee: number;
            serviceFee: number;
            totalAmount: number;
        }[];
    }>;
    list(q?: string): Promise<{
        status: boolean;
        message: string;
        data: {
            nationality: any;
            destinations: number;
        }[];
    }>;
    destinations(nationality?: string, q?: string): Promise<{
        status: boolean;
        message: string;
        data: {
            destination: any;
            products: number;
        }[];
    }>;
}
