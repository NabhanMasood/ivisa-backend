import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Country } from './entities/country.entity';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';

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

  async findOne(id: number): Promise<any> {
    try {
      const country = await this.countryRepo.findOne({ where: { id } });
      if (!country) {
        throw new NotFoundException(`Country with ID ${id} not found`);
      }
      return {
        id: country.id,
        countryName: country.countryName,
        createdAt: country.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
        updatedAt: country.updatedAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Error fetching country');
    }
  }

  async update(id: number, updateDto: UpdateCountryDto): Promise<Country> {
    try {
      const country = await this.countryRepo.findOne({ where: { id } });
      if (!country) {
        throw new NotFoundException(`Country with ID ${id} not found`);
      }

      if (updateDto.countryName) {
        const existing = await this.countryRepo.findOne({
          where: { countryName: updateDto.countryName },
        });
        if (existing && existing.id !== id) {
          throw new BadRequestException('Country name already exists');
        }
      }

      Object.assign(country, updateDto);
      return this.countryRepo.save(country);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Error updating country');
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const country = await this.countryRepo.findOne({ where: { id } });
      if (!country) {
        throw new NotFoundException(`Country with ID ${id} not found`);
      }
      await this.countryRepo.remove(country);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Error deleting country');
    }
  }
}
