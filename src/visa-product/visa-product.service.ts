import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { VisaProduct } from './entities/visa-product.entity';
import { CreateVisaProductDto } from './dto/create-visa-product.dto';

@Injectable()
export class VisaProductService {
    constructor(
        @InjectRepository(VisaProduct)
        private visaProductRepo: Repository<VisaProduct>,
    ) {}

    async create(createDto: CreateVisaProductDto) {
        try {
            const visaProduct = this.visaProductRepo.create(createDto);
            const result = await this.visaProductRepo.save(visaProduct);
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

    // Get all visa products with optional search
    async findAll(country?: string, productName?: string) {
        try {
            const where: any = {};
            if (country) where.country = ILike(`%${country}%`);
            if (productName) where.productName = ILike(`%${productName}%`);

            const result = await this.visaProductRepo.find({ where });
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

    // Grouped by country with optional search
    async groupedByCountry(search?: string) {
        try {
            const qb = this.visaProductRepo.createQueryBuilder('visa')
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

    // Find by country with optional productName search
    async findByCountry(country: string, productName?: string) {
        try {
            const where: any = { country: ILike(country) };
            if (productName) where.productName = ILike(`%${productName}%`);

            const result = await this.visaProductRepo.find({ where });
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
            const result = await this.visaProductRepo.findOne({ where: { id } });
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
}
