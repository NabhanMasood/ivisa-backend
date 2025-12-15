import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  async create(@Body() createDto: CreateCouponDto) {
    try {
      const coupon = await this.couponsService.create(createDto);
      return {
        status: true,
        message: 'Coupon created successfully',
        data: coupon,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to create coupon',
      });
    }
  }

  @Get()
  async findAll() {
    try {
      const coupons = await this.couponsService.findAll();
      return {
        status: true,
        message: 'Coupons retrieved successfully',
        count: coupons.length,
        data: coupons,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch coupons',
      });
    }
  }

  @Post('validate')
  async validate(@Body() validateDto: ValidateCouponDto) {
    try {
      const coupon = await this.couponsService.validate(validateDto);
      return {
        status: true,
        message: 'Coupon is valid',
        data: coupon,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Coupon validation failed',
      });
    }
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const coupon = await this.couponsService.findOne(id);
      return {
        status: true,
        message: 'Coupon retrieved successfully',
        data: coupon,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch coupon',
      });
    }
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateCouponDto) {
    try {
      const coupon = await this.couponsService.update(id, updateDto);
      return {
        status: true,
        message: 'Coupon updated successfully',
        data: coupon,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to update coupon',
      });
    }
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.couponsService.remove(id);
      return {
        status: true,
        message: 'Coupon deleted successfully',
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to delete coupon',
      });
    }
  }
}


