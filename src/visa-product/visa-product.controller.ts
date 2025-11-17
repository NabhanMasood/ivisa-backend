import { Controller, Get, Post, Body, Param, Query, Patch } from '@nestjs/common';
import { VisaProductService } from './visa-product.service';
import { CreateVisaProductDto } from './dto/create-visa-product.dto';

@Controller('visa-product')
export class VisaProductController {
  constructor(private readonly visaProductService: VisaProductService) {}

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

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.visaProductService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() updateDto: CreateVisaProductDto) {
    return this.visaProductService.update(id, updateDto);
  }
}
