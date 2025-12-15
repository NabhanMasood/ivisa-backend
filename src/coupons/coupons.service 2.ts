import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from './entities/coupon.entity';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
  ) {}

  async create(createDto: CreateCouponDto): Promise<Coupon> {
    const existingWithCode = await this.couponRepository.findOne({
      where: { code: createDto.code },
    });
    if (existingWithCode) {
      throw new BadRequestException('Coupon code already exists');
    }
    const coupon = this.couponRepository.create({
      ...createDto,
      usageLimit: createDto.usageLimit ?? null, // Default to null (unlimited) if not provided
      usageCount: 0, // Initialize usage count to 0
      status: createDto.status ?? 'enable', // Default to 'enable' if not provided
    });
    return await this.couponRepository.save(coupon);
  }

  async findAll(): Promise<Coupon[]> {
    return await this.couponRepository.find({
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Coupon> {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return coupon;
  }

  async validate(validateDto: ValidateCouponDto): Promise<Coupon> {
    const coupon = await this.couponRepository.findOne({
      where: { code: validateDto.code },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon code not found');
    }

    // Check if coupon is enabled
    if (coupon.status === 'disable') {
      throw new BadRequestException('The coupon code does not exist');
    }

    // Check if coupon is expired
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    const validityDate = new Date(coupon.validity);
    validityDate.setHours(0, 0, 0, 0);

    if (validityDate < today) {
      throw new BadRequestException('Coupon has expired');
    }

    // Check if coupon has reached usage limit
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit has been reached');
    }

    return coupon;
  }

  /**
   * Increment the usage count for a coupon
   * This should be called when a coupon is successfully used in an order/application
   */
  async incrementUsage(code: string): Promise<Coupon> {
    const coupon = await this.couponRepository.findOne({
      where: { code },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon code not found');
    }

    // Check if coupon has reached usage limit before incrementing
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit has been reached');
    }

    coupon.usageCount = (coupon.usageCount || 0) + 1;
    return await this.couponRepository.save(coupon);
  }

  async update(id: number, updateDto: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.findOne(id);
    
    // Check if code is being updated and if it already exists
    if (updateDto.code && updateDto.code !== coupon.code) {
      const existingWithCode = await this.couponRepository.findOne({
        where: { code: updateDto.code },
      });
      if (existingWithCode) {
        throw new BadRequestException('Coupon code already exists');
      }
    }
    
    Object.assign(coupon, updateDto);
    return await this.couponRepository.save(coupon);
  }

  async remove(id: number): Promise<void> {
    const coupon = await this.findOne(id);
    await this.couponRepository.remove(coupon);
    
    // Reorder IDs to be sequential (1, 2, 3, ...)
    await this.reorderIds();
  }

  private async reorderIds(): Promise<void> {
    // Get all remaining coupons ordered by current ID
    const coupons = await this.couponRepository.find({
      order: { id: 'ASC' },
    });

    if (coupons.length === 0) {
      return;
    }

    // Use a transaction to update all IDs sequentially
    await this.couponRepository.manager.transaction(async (transactionalEntityManager) => {
      // First, set all IDs to negative values to avoid conflicts
      for (let i = 0; i < coupons.length; i++) {
        await transactionalEntityManager.query(
          `UPDATE coupons SET id = $1 WHERE id = $2`,
          [-(i + 1), coupons[i].id]
        );
      }

      // Then, set them to positive sequential IDs (1, 2, 3, ...)
      for (let i = 0; i < coupons.length; i++) {
        await transactionalEntityManager.query(
          `UPDATE coupons SET id = $1 WHERE id = $2`,
          [i + 1, -(i + 1)]
        );
      }

      // Reset the sequence to the next available ID
      await transactionalEntityManager.query(
        `SELECT setval('coupons_id_seq', $1, true)`,
        [coupons.length]
      );
    });
  }
}


