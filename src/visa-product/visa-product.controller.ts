import { Controller, Get, Post, Body, Param, Query, Patch, Delete } from '@nestjs/common';
import { VisaProductService } from './visa-product.service';
import { CreateVisaProductDto } from './dto/create-visa-product.dto';

@Controller('visa-product')
export class VisaProductController {
  constructor(private readonly visaProductService: VisaProductService) { }

  @Post()
  create(@Body() createDto: CreateVisaProductDto) {
    return this.visaProductService.create(createDto);
  }

  @Get()
  findAll(@Query('country') country?: string, @Query('productName') productName?: string) {
    return this.visaProductService.findAll(country, productName);
  }

  @Get('grouped/countries')
  groupedByCountry(@Query('search') search?: string) {
    return this.visaProductService.groupedByCountry(search);
  }

  @Get('by-country')
  findByCountry(
    @Query('country') country: string,
    @Query('productName') productName?: string,
  ) {
    return this.visaProductService.findByCountry(country, productName);
  }

  /**
   * Duplicate a visa product (additional form) (Admin only)
   * Creates a copy of an existing visa product with all its fields and processing fees
   * Note: This route must come before generic :id routes to avoid conflicts
   */
  @Post(':id/duplicate')
  duplicate(@Param('id') id: number) {
    return this.visaProductService.duplicate(id);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.visaProductService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() updateDto: CreateVisaProductDto) {
    return this.visaProductService.update(id, updateDto);
  }

  /**
   * Delete a visa product (additional form) (Admin only)
   */
  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.visaProductService.remove(id);
  }
}
