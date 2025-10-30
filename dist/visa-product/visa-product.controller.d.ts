import { VisaProductService } from './visa-product.service';
import { CreateVisaProductDto } from './dto/create-visa-product.dto';
export declare class VisaProductController {
    private readonly visaProductService;
    constructor(visaProductService: VisaProductService);
    create(createDto: CreateVisaProductDto): Promise<{
        status: boolean;
        message: string;
        data: import("./entities/visa-product.entity").VisaProduct;
        error?: undefined;
    } | {
        status: boolean;
        message: string;
        error: any;
        data?: undefined;
    }>;
    findAll(country?: string, productName?: string): Promise<{
        status: boolean;
        message: string;
        count: number;
        data: import("./entities/visa-product.entity").VisaProduct[];
        error?: undefined;
    } | {
        status: boolean;
        message: string;
        error: any;
        count?: undefined;
        data?: undefined;
    }>;
    groupedByCountry(search?: string): Promise<{
        status: boolean;
        message: string;
        count: number;
        data: any[];
        error?: undefined;
    } | {
        status: boolean;
        message: string;
        error: any;
        count?: undefined;
        data?: undefined;
    }>;
    findByCountry(country: string, productName?: string): Promise<{
        status: boolean;
        message: string;
        count: number;
        data: import("./entities/visa-product.entity").VisaProduct[];
        error?: undefined;
    } | {
        status: boolean;
        message: string;
        error: any;
        count?: undefined;
        data?: undefined;
    }>;
    findOne(id: number): Promise<{
        status: boolean;
        message: string;
        data?: undefined;
        error?: undefined;
    } | {
        status: boolean;
        message: string;
        data: import("./entities/visa-product.entity").VisaProduct;
        error?: undefined;
    } | {
        status: boolean;
        message: string;
        error: any;
        data?: undefined;
    }>;
}
