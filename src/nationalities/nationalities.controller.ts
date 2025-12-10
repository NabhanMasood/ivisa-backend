import { Controller, Get, Post, Body, Query, BadRequestException, HttpCode, HttpStatus, UseFilters, Param, Delete, ParseIntPipe, Patch } from '@nestjs/common';
import { NationalitiesService } from './nationalities.service';
import { CreateNationalityDto } from './dto/create-nationality.dto';
import { UpdateNationalityDto } from './dto/update-nationality.dto';
import { NationalitiesHttpExceptionFilter } from './http-exception.filter';

@Controller('nationalities')
@UseFilters(NationalitiesHttpExceptionFilter)
export class NationalitiesController {
  constructor(private readonly service: NationalitiesService) { }

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

  @Get()
  async findAll(@Query('q') q?: string) {
    try {
      const result = await this.service.findAll(q);
      return { status: true, message: 'Nationalities fetched successfully', data: result };
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
  // includeFreeVisas: query parameter to include free visa products (for admin use)
  @Get(':nationality/:destination/products')
  async getProductsByNationalityAndDestination(
    @Param('nationality') nationality: string,
    @Param('destination') destination: string,
    @Query('includeFreeVisas') includeFreeVisas?: string,
  ) {
    try {
      // Convert query parameter to boolean (default false for client-side)
      const includeFree = includeFreeVisas === 'true' || includeFreeVisas === '1';
      const result = await this.service.getProductsByNationalityAndDestination(
        nationality,
        destination,
        includeFree,
      );

      // If no products are configured (hasProducts: false), return status: false
      if (!result.hasProducts) {
        return {
          status: false,
          message: 'No visa products are configured for this nationality-destination combination',
          data: [],
        };
      }

      // If products exist but are free visa, return status: true with empty array
      // If products exist and are not free, return status: true with products
      return {
        status: true,
        message: result.isFreeVisa
          ? 'Visa is free for this nationality-destination combination'
          : 'Products fetched successfully',
        data: result.products,
        isFreeVisa: result.isFreeVisa,
      };
    } catch (err) {
      throw new BadRequestException({ message: err.message });
    }
  }

  /**
   * Update a nationality record by ID
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNationalityDto,
  ) {
    try {
      const result = await this.service.update(id, dto);
      return { status: true, message: 'Nationality updated successfully', data: result };
    } catch (err) {
      throw new BadRequestException({ message: err.message });
    }
  }

  /**
   * Delete a nationality record by ID
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.service.remove(id);
      return { status: true, message: 'Nationality deleted successfully' };
    } catch (err) {
      throw new BadRequestException({ message: err.message });
    }
  }
}
