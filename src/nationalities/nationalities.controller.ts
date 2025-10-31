import { Controller, Get, Post, Body, Query, BadRequestException, HttpCode, HttpStatus, UseFilters, Param } from '@nestjs/common';
import { NationalitiesService } from './nationalities.service';
import { CreateNationalityDto } from './dto/create-nationality.dto';
import { NationalitiesHttpExceptionFilter } from './http-exception.filter';

@Controller('nationalities')
@UseFilters(NationalitiesHttpExceptionFilter)
export class NationalitiesController {
  constructor(private readonly service: NationalitiesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateNationalityDto) {
    try {
      const result = await this.service.create(dto);
      return { status: true, message: 'Nationality created successfully', data: result };
    } catch (err) {
      throw new BadRequestException({ message: err.message });
    }
  }

  @Get('nationality-dropdown')
  async nationalityDropdown() {
    const result = await this.service.getNationalities();
    return { status: true, data: result };
  }

  @Get('destination-dropdown')
  async destinationDropdown() {
    const result = await this.service.getDestinations();
    return { status: true, data: result };
  }

  @Get('products')
  async products(@Query('destination') destination: string) {
    if (!destination || !destination.trim()) {
      throw new BadRequestException({ message: 'Query parameter "destination" is required' });
    }
    const result = await this.service.getProducts(destination);
    return { status: true, message: 'Products fetched successfully', data: result };
  }

  @Get('list')
  async list(@Query('q') q?: string) {
    const result = await this.service.listWithDestinationCounts(q);
    return { status: true, message: 'Nationalities fetched successfully', data: result };
  }

  @Get('destinations')
  async destinations(
    @Query('nationality') nationality?: string,
    @Query('q') q?: string,
  ) {
    const result = await this.service.listDestinationsWithCounts({ nationality, q });
    return { status: true, message: 'Destinations fetched successfully', data: result };
  }

  // Get destinations for a specific nationality (when view is clicked on nationality)
  @Get(':nationality/destinations')
  async getDestinationsByNationality(@Param('nationality') nationality: string) {
    try {
      const result = await this.service.getDestinationsByNationality(nationality);
      return {
        status: true,
        message: 'Destinations fetched successfully',
        data: result,
      };
    } catch (err) {
      throw new BadRequestException({ message: err.message });
    }
  }

  // Get products for nationality-destination combination (when view is clicked on destination)
  @Get(':nationality/:destination/products')
  async getProductsByNationalityAndDestination(
    @Param('nationality') nationality: string,
    @Param('destination') destination: string,
  ) {
    try {
      const result = await this.service.getProductsByNationalityAndDestination(nationality, destination);
      return {
        status: true,
        message: 'Products fetched successfully',
        data: result,
      };
    } catch (err) {
      throw new BadRequestException({ message: err.message });
    }
  }
}
