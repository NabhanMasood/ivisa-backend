import { Controller, Get, Post, Body, Query, BadRequestException, Param, Patch, Delete, ParseIntPipe } from '@nestjs/common';
import { CountriesService } from './countries.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';

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

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const country = await this.countriesService.findOne(id);
      return {
        status: true,
        message: 'Country retrieved successfully',
        data: country,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch country',
      });
    }
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateCountryDto) {
    try {
      const country = await this.countriesService.update(id, updateDto);
      return {
        status: true,
        message: 'Country updated successfully',
        data: country,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to update country',
      });
    }
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.countriesService.remove(id);
      return {
        status: true,
        message: 'Country deleted successfully',
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to delete country',
      });
    }
  }
}
