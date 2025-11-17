import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  BadRequestException,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  async create(@Body() createDto: CreateCustomerDto) {
    try {
      const customer = await this.customersService.create(createDto);
      return {
        status: true,
        message: 'Customer created successfully',
        data: customer,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to create customer',
      });
    }
  }

  @Get('summary')
  async getSummary() {
    try {
      return await this.customersService.getSummary();
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch customer summary',
      });
    }
  }

  @Get()
  async findAll(@Query('search') search: string) {
    try {
      const customers = await this.customersService.findAll(search);
      return {
        status: true,
        message: 'Customers retrieved successfully',
        count: customers.length,
        data: customers,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch customers',
      });
    }
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const customer = await this.customersService.findOne(id);
      return {
        status: true,
        message: 'Customer retrieved successfully',
        data: customer,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch customer',
      });
    }
  }

  @Get(':id/applications')
  async findCustomerApplications(
    @Param('id', ParseIntPipe) id: number,
    @Query('search') search: string,
  ) {
    try {
      const applications = await this.customersService.findCustomerApplications(id, search);
      return {
        status: true,
        message: 'Applications retrieved successfully',
        count: applications.length,
        data: applications,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch applications',
      });
    }
  }

  @Get(':id/billing')
  async findCustomerBilling(@Param('id', ParseIntPipe) id: number) {
    try {
      const billingInfo = await this.customersService.findCustomerBillingInfo(id);
      return {
        status: true,
        message: 'Billing information retrieved successfully',
        data: billingInfo,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch billing information',
      });
    }
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateCustomerDto) {
    try {
      const customer = await this.customersService.update(id, updateDto);
      return {
        status: true,
        message: 'Customer updated successfully',
        data: customer,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to update customer',
      });
    }
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.customersService.remove(id);
      return {
        status: true,
        message: 'Customer deleted successfully',
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to delete customer',
      });
    }
  }
}

