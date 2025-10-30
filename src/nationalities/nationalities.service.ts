import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Nationality } from './entities/nationality.entity';
import { CreateNationalityDto } from './dto/create-nationality.dto';
import { Country } from '../countries/entities/country.entity';
import { VisaProduct } from '../visa-product/entities/visa-product.entity';

@Injectable()
export class NationalitiesService {
  constructor(
    @InjectRepository(Nationality) private nationalityRepo: Repository<Nationality>,
    @InjectRepository(Country) private countryRepo: Repository<Country>,
    @InjectRepository(VisaProduct) private visaProductRepo: Repository<VisaProduct>,
  ) {}

  // Create nationality with product
  async create(dto: CreateNationalityDto) {
    const countryExists = await this.countryRepo.findOne({ where: { countryName: dto.nationality } });
    if (!countryExists) throw new BadRequestException('Nationality does not exist');

    const destinationExists = await this.visaProductRepo.findOne({ where: { country: dto.destination, productName: dto.productName } });
    if (!destinationExists) throw new BadRequestException('Product not found for destination');

    const nationality = this.nationalityRepo.create(dto);
    return this.nationalityRepo.save(nationality);
  }

  // Get dropdown for nationalities
  async getNationalities() {
    const countries = await this.countryRepo.find();
    return countries.map(c => c.countryName);
  }

  // Get dropdown for destinations
  async getDestinations() {
    const rawDestinations = await this.visaProductRepo
      .createQueryBuilder('visa')
      .select('visa.country', 'country')
      .where('visa.country IS NOT NULL')
      .distinct(true)
      .orderBy('visa.country', 'ASC')
      .getRawMany();

    return rawDestinations
      .map(d => d.country)
      .filter((c: string | null) => !!c);
  }

  // Get products for a selected destination
  async getProducts(destination: string) {
    const products = await this.visaProductRepo.find({ where: { country: destination } });
    return products.map(p => ({
      productName: p.productName,
      duration: p.duration,
      validity: p.validity,
      govtFee: p.govtFee,
      serviceFee: p.serviceFee,
      totalAmount: p.totalAmount,
    }));
  }

  // List nationalities with count of destinations
  async listWithDestinationCounts(q?: string) {
    const qb = this.nationalityRepo
      .createQueryBuilder('n')
      .select('n.nationality', 'nationality')
      .addSelect('COUNT(DISTINCT n.destination)', 'destinations');

    if (q && q.trim()) {
      qb.where('LOWER(n.nationality) LIKE :q', { q: `%${q.toLowerCase()}%` });
    }

    const rows = await qb
      .groupBy('n.nationality')
      .orderBy('n.nationality', 'ASC')
      .getRawMany();

    return rows.map(r => ({
      nationality: r.nationality,
      destinations: Number(r.destinations),
    }));
  }

  // List destinations with count of selected visa products
  async listDestinationsWithCounts(filters?: { nationality?: string; q?: string }) {
    const qb = this.nationalityRepo
      .createQueryBuilder('n')
      .select('n.destination', 'destination')
      .addSelect('COUNT(n.productName)', 'products');

    if (filters?.nationality) {
      qb.where('n.nationality = :nat', { nat: filters.nationality });
    }

    if (filters?.q && filters.q.trim()) {
      const like = `%${filters.q.toLowerCase()}%`;
      qb.andWhere('LOWER(n.destination) LIKE :q', { q: like });
    }

    const rows = await qb
      .groupBy('n.destination')
      .orderBy('n.destination', 'ASC')
      .getRawMany();

    return rows.map(r => ({ destination: r.destination, products: Number(r.products) }));
  }
}
