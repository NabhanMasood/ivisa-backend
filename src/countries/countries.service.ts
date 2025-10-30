import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Country } from './entities/country.entity';
import { CreateCountryDto } from './dto/create-country.dto';

@Injectable()
export class CountriesService {
  constructor(
    @InjectRepository(Country)
    private countryRepo: Repository<Country>,
  ) {}

  async create(createDto: CreateCountryDto): Promise<Country> {
    try {
      const existing = await this.countryRepo.findOne({
        where: { countryName: createDto.countryName },
      });
      if (existing) {
        throw new BadRequestException('Country already exists');
      }
      const country = this.countryRepo.create(createDto);
      return this.countryRepo.save(country);
    } catch (error) {
      throw new BadRequestException(error.message || 'Error creating country');
    }
  }

  async findAll(search?: string): Promise<any[]> {
    const query = this.countryRepo.createQueryBuilder('country');

    if (search) {
      query.where('country.countryName ILIKE :search', { search: `%${search}%` });
    }

    const countries = await query.getMany();

    return countries.map(c => ({
      id: c.id,
      countryName: c.countryName,
      createdAt: c.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
      updatedAt: c.updatedAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    }));
  }
}
