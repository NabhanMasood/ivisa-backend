import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Nationality } from './entities/nationality.entity';
import { CreateNationalityDto } from './dto/create-nationality.dto';
import { UpdateNationalityDto } from './dto/update-nationality.dto';
import { Country } from '../countries/entities/country.entity';
import { VisaProduct } from '../visa-product/entities/visa-product.entity';

@Injectable()
export class NationalitiesService {
  constructor(
    @InjectRepository(Nationality) private nationalityRepo: Repository<Nationality>,
    @InjectRepository(Country) private countryRepo: Repository<Country>,
    @InjectRepository(VisaProduct) private visaProductRepo: Repository<VisaProduct>,
  ) { }

  // Create nationality with product
  async create(dto: CreateNationalityDto) {
    const countryExists = await this.countryRepo.findOne({ where: { countryName: dto.nationality } });
    if (!countryExists) throw new BadRequestException('Nationality does not exist');

    const destinationExists = await this.visaProductRepo.findOne({ where: { country: dto.destination, productName: dto.productName } });
    if (!destinationExists) throw new BadRequestException('Product not found for destination');

    const nationality = this.nationalityRepo.create(dto);
    return this.nationalityRepo.save(nationality);
  }

  // Get all nationalities (with optional search)
  async findAll(q?: string) {
    const query = this.nationalityRepo.createQueryBuilder('n');

    if (q && q.trim()) {
      query.where('LOWER(n.nationality) LIKE :q', { q: `%${q.toLowerCase()}%` })
        .orWhere('LOWER(n.destination) LIKE :q', { q: `%${q.toLowerCase()}%` })
        .orWhere('LOWER(n.productName) LIKE :q', { q: `%${q.toLowerCase()}%` });
    }

    const nationalities = await query.orderBy('n.nationality', 'ASC').getMany();

    return nationalities.map(n => ({
      id: n.id,
      nationality: n.nationality,
      destination: n.destination,
      productName: n.productName,
      govtFee: n.govtFee,
      serviceFee: n.serviceFee,
      totalAmount: n.totalAmount,
      isFreeVisa: n.isFreeVisa,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }));
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

  // Get destinations for a specific nationality (when view is clicked on nationality)
  async getDestinationsByNationality(nationality: string) {
    if (!nationality || !nationality.trim()) {
      throw new BadRequestException('Nationality is required');
    }

    const destinations = await this.nationalityRepo
      .createQueryBuilder('n')
      .select('DISTINCT n.destination', 'destination')
      .where('LOWER(n.nationality) = LOWER(:nationality)', { nationality })
      .orderBy('n.destination', 'ASC')
      .getRawMany();

    return destinations.map(d => d.destination);
  }

  // ✅ FIXED: Get products (productNames with details) for a nationality-destination combination
  // includeFreeVisas: if true, includes free visa products (for admin). Default false (for client-side)
  // Returns: { products: Array, isFreeVisa: boolean, hasProducts: boolean }
  async getProductsByNationalityAndDestination(
    nationality: string,
    destination: string,
    includeFreeVisas: boolean = false,
  ) {
    if (!nationality || !nationality.trim()) {
      throw new BadRequestException('Nationality is required');
    }
    if (!destination || !destination.trim()) {
      throw new BadRequestException('Destination is required');
    }

    // First, check if ANY records exist for this nationality-destination pair
    const totalRecords = await this.nationalityRepo
      .createQueryBuilder('n')
      .where('LOWER(n.nationality) = LOWER(:nationality)', { nationality })
      .andWhere('LOWER(n.destination) = LOWER(:destination)', { destination })
      .getCount();

    // If no records exist at all, this means no products are configured
    if (totalRecords === 0) {
      return { products: [], isFreeVisa: false, hasProducts: false };
    }

    // Check if ANY product for this nationality-destination pair is marked as free visa
    // If yes, and we're not including free visas, return empty array (hide all products)
    if (!includeFreeVisas) {
      const hasFreeVisa = await this.nationalityRepo
        .createQueryBuilder('n')
        .where('LOWER(n.nationality) = LOWER(:nationality)', { nationality })
        .andWhere('LOWER(n.destination) = LOWER(:destination)', { destination })
        .andWhere('n.isFreeVisa = :isFreeVisa', { isFreeVisa: true })
        .getCount();

      // If any product is marked as free visa, hide ALL products for this pair
      if (hasFreeVisa > 0) {
        return { products: [], isFreeVisa: true, hasProducts: true };
      }
    }

    // Get all products for this nationality-destination pair (excluding free visa ones if client-side)
    const queryBuilder = this.nationalityRepo
      .createQueryBuilder('n')
      .where('LOWER(n.nationality) = LOWER(:nationality)', { nationality })
      .andWhere('LOWER(n.destination) = LOWER(:destination)', { destination });

    // For admin view, include all products. For client, we already checked and returned empty if free visa exists
    if (!includeFreeVisas) {
      queryBuilder.andWhere('n.isFreeVisa = :isFreeVisa', { isFreeVisa: false });
    }

    const nationalityProducts = await queryBuilder
      .orderBy('n.productName', 'ASC')
      .getMany();

    const products: Array<{
      id: number;
      productName: string;
      duration: number;
      validity: number;
      visaType: string;
      entryType: string;
      customEntryName?: string;
      govtFee: number;
      serviceFee: number;
      totalAmount: number;
    }> = [];

    const processedProducts = new Set<string>();

    for (const np of nationalityProducts) {
      if (processedProducts.has(np.productName.toLowerCase())) {
        continue;
      }

      const visaProduct = await this.visaProductRepo
        .createQueryBuilder('v')
        .where('LOWER(v.country) = LOWER(:destination)', { destination })
        .andWhere('LOWER(v.productName) = LOWER(:productName)', { productName: np.productName })
        .getOne();

      if (visaProduct) {
        // Use customEntryName if entryType is 'custom', otherwise use entryType
        const entryTypeValue = visaProduct.entryType === 'custom' && visaProduct.customEntryName
          ? visaProduct.customEntryName
          : visaProduct.entryType;

        products.push({
          id: visaProduct.id,
          productName: np.productName,
          duration: visaProduct.duration,
          validity: visaProduct.validity,
          entryType: visaProduct.entryType,
          customEntryName: visaProduct.customEntryName,
          visaType: `${visaProduct.validity}-${entryTypeValue}`,
          govtFee: np.govtFee !== null && np.govtFee !== undefined ? np.govtFee : visaProduct.govtFee,
          serviceFee: np.serviceFee !== null && np.serviceFee !== undefined ? np.serviceFee : visaProduct.serviceFee,
          totalAmount: np.totalAmount !== null && np.totalAmount !== undefined ? np.totalAmount : visaProduct.totalAmount,
        });

        processedProducts.add(np.productName.toLowerCase());
      }
    }

    return { products, isFreeVisa: false, hasProducts: true };
  }

  /**
   * Update a nationality record by ID
   */
  async update(id: number, dto: UpdateNationalityDto) {
    try {
      const nationality = await this.nationalityRepo.findOne({ where: { id } });

      if (!nationality) {
        throw new NotFoundException(`Nationality with ID ${id} not found`);
      }

      // Validate country exists if nationality is being updated
      if (dto.nationality !== undefined && dto.nationality !== null) {
        const countryExists = await this.countryRepo.findOne({ where: { countryName: dto.nationality } });
        if (!countryExists) throw new BadRequestException('Nationality does not exist');
      }

      // Validate product exists if destination/productName is being updated
      if (dto.destination !== undefined && dto.productName !== undefined) {
        const destinationExists = await this.visaProductRepo.findOne({
          where: { country: dto.destination, productName: dto.productName }
        });
        if (!destinationExists) throw new BadRequestException('Product not found for destination');
      }

      // Update the nationality record with only provided fields
      Object.assign(nationality, dto);
      return await this.nationalityRepo.save(nationality);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Error updating nationality');
    }
  }

  /**
   * Delete a nationality record by ID
   */
  async remove(id: number): Promise<void> {
    try {
      const nationality = await this.nationalityRepo.findOne({ where: { id } });

      if (!nationality) {
        throw new NotFoundException(`Nationality with ID ${id} not found`);
      }

      await this.nationalityRepo.remove(nationality);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Error deleting nationality');
    }
  }
}
