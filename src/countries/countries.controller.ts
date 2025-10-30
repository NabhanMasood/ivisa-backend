import { Controller, Get, Post, Body, Query, BadRequestException } from '@nestjs/common';
import { CountriesService } from './countries.service';
import { CreateCountryDto } from './dto/create-country.dto';

@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Post()
  async create(@Body() createDto: CreateCountryDto) {
    try {
      const country = await this.countriesService.create(createDto);
      return {
        status: true,
        message: 'Country created successfully',
        data: country,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to create country',
      });
    }
  }

  @Get()
  async findAll(@Query('search') search: string) {
    try {
      const countries = await this.countriesService.findAll(search);
      return {
        status: true,
        message: 'Countries retrieved successfully',
        count: countries.length,
        data: countries,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch countries',
      });
    }
  }
}
