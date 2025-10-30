import { Repository } from 'typeorm';
import { Nationality } from './entities/nationality.entity';
import { CreateNationalityDto } from './dto/create-nationality.dto';
import { Country } from '../countries/entities/country.entity';
import { VisaProduct } from '../visa-product/entities/visa-product.entity';
export declare class NationalitiesService {
    private nationalityRepo;
    private countryRepo;
    private visaProductRepo;
    constructor(nationalityRepo: Repository<Nationality>, countryRepo: Repository<Country>, visaProductRepo: Repository<VisaProduct>);
    create(dto: CreateNationalityDto): Promise<Nationality>;
    getNationalities(): Promise<string[]>;
    getDestinations(): Promise<any[]>;
    getProducts(destination: string): Promise<{
        productName: string;
        duration: number;
        validity: number;
        govtFee: number;
        serviceFee: number;
        totalAmount: number;
    }[]>;
    listWithDestinationCounts(q?: string): Promise<{
        nationality: any;
        destinations: number;
    }[]>;
    listDestinationsWithCounts(filters?: {
        nationality?: string;
        q?: string;
    }): Promise<{
        destination: any;
        products: number;
    }[]>;
}
