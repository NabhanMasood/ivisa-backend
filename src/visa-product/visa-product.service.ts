import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { VisaProduct } from './entities/visa-product.entity';
import { ProcessingFee } from './entities/processing-fee.entity';
import { CreateVisaProductDto } from './dto/create-visa-product.dto';
import { VisaApplication } from '../visa-applications/entities/visa-application.entity';

@Injectable()
export class VisaProductService {
  constructor(
    @InjectRepository(VisaProduct)
    private visaProductRepo: Repository<VisaProduct>,
    @InjectRepository(ProcessingFee)
    private processingFeeRepo: Repository<ProcessingFee>,
    @InjectRepository(VisaApplication)
    private applicationRepo: Repository<VisaApplication>,
  ) { }

  async create(createDto: CreateVisaProductDto) {
    try {
      const { processingFees, ...visaProductData } = createDto;

      // Create visa product
      const visaProduct = this.visaProductRepo.create(visaProductData);
      const savedProduct = await this.visaProductRepo.save(visaProduct);

      // Create processing fees if provided
      if (processingFees && processingFees.length > 0) {
        const fees = processingFees.map((fee) =>
          this.processingFeeRepo.create({
            ...fee,
            visaProductId: savedProduct.id,
          })
        );
        await this.processingFeeRepo.save(fees);
      }

      // Fetch the complete product with processing fees
      const result = await this.visaProductRepo.findOne({
        where: { id: savedProduct.id },
        relations: ['processingFees'],
      });

      return {
        status: true,
        message: 'Visa product created successfully',
        data: result,
      };
    } catch (error) {
      return {
        status: false,
        message: 'Error creating visa product',
        error: error.message,
      };
    }
  }

  async findAll(country?: string, productName?: string) {
    try {
      const where: any = {};
      if (country) where.country = ILike(`%${country}%`);
      if (productName) where.productName = ILike(`%${productName}%`);

      const result = await this.visaProductRepo.find({
        where,
        relations: ['processingFees'],
      });

      return {
        status: true,
        message: 'Visa products fetched successfully',
        count: result.length,
        data: result,
      };
    } catch (error) {
      return {
        status: false,
        message: 'Error fetching visa products',
        error: error.message,
      };
    }
  }

  async groupedByCountry(search?: string) {
    try {
      const qb = this.visaProductRepo
        .createQueryBuilder('visa')
        .select('visa.country', 'country')
        .addSelect('COUNT(visa.id)', 'productCount')
        .groupBy('visa.country');

      if (search) {
        qb.where('visa.country ILIKE :search', { search: `%${search}%` });
      }

      const result = await qb.getRawMany();
      return {
        status: true,
        message: 'Visa products grouped by country',
        count: result.length,
        data: result,
      };
    } catch (error) {
      return {
        status: false,
        message: 'Error grouping visa products',
        error: error.message,
      };
    }
  }

  async findByCountry(country: string, productName?: string) {
    try {
      const where: any = { country: ILike(country) };
      if (productName) where.productName = ILike(`%${productName}%`);

      const result = await this.visaProductRepo.find({
        where,
        relations: ['processingFees'],
      });

      return {
        status: true,
        message: `Visa products for country: ${country}`,
        count: result.length,
        data: result,
      };
    } catch (error) {
      return {
        status: false,
        message: `Error fetching products for country: ${country}`,
        error: error.message,
      };
    }
  }

  async findOne(id: number) {
    try {
      const result = await this.visaProductRepo.findOne({
        where: { id },
        relations: ['processingFees'],
      });

      if (!result) {
        return {
          status: false,
          message: `Visa product with id ${id} not found`,
        };
      }

      return {
        status: true,
        message: 'Visa product fetched successfully',
        data: result,
      };
    } catch (error) {
      return {
        status: false,
        message: 'Error fetching visa product',
        error: error.message,
      };
    }
  }

  async update(id: number, updateDto: CreateVisaProductDto) {
    try {
      const { processingFees, ...visaProductData } = updateDto;

      // Update visa product
      await this.visaProductRepo.update(id, visaProductData);

      // Delete existing processing fees
      await this.processingFeeRepo.delete({ visaProductId: id });

      // Create new processing fees if provided
      if (processingFees && processingFees.length > 0) {
        const fees = processingFees.map((fee) =>
          this.processingFeeRepo.create({
            ...fee,
            visaProductId: id,
          })
        );
        await this.processingFeeRepo.save(fees);
      }

      // Fetch the updated product with processing fees
      const result = await this.visaProductRepo.findOne({
        where: { id },
        relations: ['processingFees'],
      });

      return {
        status: true,
        message: 'Visa product updated successfully',
        data: result,
      };
    } catch (error) {
      return {
        status: false,
        message: 'Error updating visa product',
        error: error.message,
      };
    }
  }

  /**
   * Duplicate a visa product (additional form) with all its fields and processing fees
   */
  async duplicate(id: number) {
    try {
      // Find the source visa product
      const sourceProduct = await this.visaProductRepo.findOne({
        where: { id },
        relations: ['processingFees'],
      });

      if (!sourceProduct) {
        throw new NotFoundException(`Visa product with ID ${id} not found`);
      }

      // Create new visa product with copied data
      const newProduct = this.visaProductRepo.create({
        country: sourceProduct.country,
        productName: `${sourceProduct.productName} (Copy)`, // Add "(Copy)" to distinguish
        duration: sourceProduct.duration,
        validity: sourceProduct.validity,
        entryType: sourceProduct.entryType,
        govtFee: sourceProduct.govtFee,
        serviceFee: sourceProduct.serviceFee,
        totalAmount: sourceProduct.totalAmount,
        fields: sourceProduct.fields ? JSON.parse(JSON.stringify(sourceProduct.fields)) : null, // Deep copy fields array
        maxFieldId: sourceProduct.maxFieldId || 0,
      });

      const savedProduct = await this.visaProductRepo.save(newProduct);

      // Copy processing fees if they exist
      if (sourceProduct.processingFees && sourceProduct.processingFees.length > 0) {
        const fees = sourceProduct.processingFees.map((fee) =>
          this.processingFeeRepo.create({
            feeType: fee.feeType,
            timeValue: fee.timeValue,
            timeUnit: fee.timeUnit,
            amount: fee.amount,
            visaProductId: savedProduct.id,
          })
        );
        await this.processingFeeRepo.save(fees);
      }

      // Fetch the complete duplicated product with processing fees
      const result = await this.visaProductRepo.findOne({
        where: { id: savedProduct.id },
        relations: ['processingFees'],
      });

      return {
        status: true,
        message: 'Visa product duplicated successfully',
        data: result,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error duplicating visa product',
      );
    }
  }

  /**
   * Delete a visa product (additional form)
   * Checks if there are any applications using this product before deleting
   */
  async remove(id: number) {
    try {
      // Check if visa product exists
      const visaProduct = await this.visaProductRepo.findOne({
        where: { id },
      });

      if (!visaProduct) {
        throw new NotFoundException(`Visa product with ID ${id} not found`);
      }

      // Check if there are any applications using this product
      const applicationsCount = await this.applicationRepo.count({
        where: { visaProductId: id },
      });

      if (applicationsCount > 0) {
        throw new BadRequestException(
          `Cannot delete visa product. There are ${applicationsCount} application(s) using this product. Please remove or reassign these applications first.`,
        );
      }

      // Delete the visa product (processing fees will be cascade deleted)
      await this.visaProductRepo.remove(visaProduct);

      return {
        status: true,
        message: 'Visa product deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error deleting visa product',
      );
    }
  }
}
