import { Repository } from 'typeorm';
import { Country } from './entities/country.entity';
import { CreateCountryDto } from './dto/create-country.dto';
export declare class CountriesService {
    private countryRepo;
    constructor(countryRepo: Repository<Country>);
    create(createDto: CreateCountryDto): Promise<Country>;
    findAll(search?: string): Promise<any[]>;
}
