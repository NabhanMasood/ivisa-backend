import { CountriesService } from './countries.service';
import { CreateCountryDto } from './dto/create-country.dto';
export declare class CountriesController {
    private readonly countriesService;
    constructor(countriesService: CountriesService);
    create(createDto: CreateCountryDto): Promise<{
        status: boolean;
        message: string;
        data: import("./entities/country.entity").Country;
    }>;
    findAll(search: string): Promise<{
        status: boolean;
        message: string;
        count: number;
        data: any[];
    }>;
}
