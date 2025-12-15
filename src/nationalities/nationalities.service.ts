import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Nationality } from './entities/nationality.entity';
import { CreateNationalityDto } from './dto/create-nationality.dto';
import { UpdateNationalityDto } from './dto/update-nationality.dto';
import { Country } from '../countries/entities/country.entity';
import { VisaProduct } from '../visa-product/entities/visa-product.entity';
import { ProcessingFee } from '../visa-product/entities/processing-fee.entity';
import { parse } from 'csv-parse/sync';

@Injectable()
export class NationalitiesService {
  constructor(
    @InjectRepository(Nationality) private nationalityRepo: Repository<Nationality>,
    @InjectRepository(Country) private countryRepo: Repository<Country>,
    @InjectRepository(VisaProduct) private visaProductRepo: Repository<VisaProduct>,
    @InjectRepository(ProcessingFee) private processingFeeRepo: Repository<ProcessingFee>,
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

  /**
   * Import visa products and nationalities from CSV file
   * Supports both standard format (one row per product) and compact format (multiple products per row)
   */
  async importFromCsv(fileBuffer: Buffer): Promise<{
    success: boolean;
    message: string;
    summary: {
      totalRows: number;
      processed: number;
      visaProductsCreated: number;
      visaProductsReused: number;
      nationalitiesCreated: number;
      errors: Array<{ row: number; error: string }>;
    };
  }> {
    const errors: Array<{ row: number; error: string }> = [];
    const stats = {
      visaProductsCreated: 0,
      visaProductsReused: 0,
      nationalitiesCreated: 0,
    };
    let processed = 0;

    try {
      // Parse CSV
      const records = parse(fileBuffer.toString(), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });

      if (!records || records.length === 0) {
        throw new BadRequestException('CSV file is empty or invalid');
      }

      const totalRows = records.length;

      // Determine format: compact format has 'products' column, standard has 'productName'
      const firstRecord = records[0] as Record<string, any>;
      const isCompactFormat = firstRecord.hasOwnProperty('products') && !firstRecord.hasOwnProperty('productName');
      const isStandardFormat = firstRecord.hasOwnProperty('productName');

      if (!isCompactFormat && !isStandardFormat) {
        throw new BadRequestException('Invalid CSV format. Must be either standard format (with productName column) or compact format (with products column)');
      }

      // Process records
      for (let i = 0; i < records.length; i++) {
        const row = i + 2; // +2 because row 1 is header, and we're 0-indexed
        const record = records[i];

        try {
          if (isCompactFormat) {
            await this.processCompactFormatRow(record, row, errors, stats);
          } else {
            await this.processStandardFormatRow(record, row, errors, stats);
          }
          processed++;
        } catch (error) {
          errors.push({
            row,
            error: error.message || 'Unknown error processing row',
          });
        }
      }

      return {
        success: errors.length === 0,
        message: errors.length === 0
          ? `Successfully imported ${processed} rows. Created ${stats.visaProductsCreated} visa products, reused ${stats.visaProductsReused}, and created ${stats.nationalitiesCreated} nationality records.`
          : `Imported ${processed} rows with ${errors.length} errors. Created ${stats.visaProductsCreated} visa products, reused ${stats.visaProductsReused}, and created ${stats.nationalitiesCreated} nationality records.`,
        summary: {
          totalRows,
          processed,
          visaProductsCreated: stats.visaProductsCreated,
          visaProductsReused: stats.visaProductsReused,
          nationalitiesCreated: stats.nationalitiesCreated,
          errors,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Error parsing CSV: ${error.message}`);
    }
  }

  /**
   * Process a row in standard format (one row per product)
   */
  private async processStandardFormatRow(
    record: any,
    row: number,
    errors: Array<{ row: number; error: string }>,
    stats: { visaProductsCreated: number; visaProductsReused: number; nationalitiesCreated: number },
  ): Promise<void> {
    // Validate required fields
    const requiredFields = ['nationality', 'destination', 'productName', 'duration', 'validity', 'entryType', 'govtFee', 'serviceFee', 'totalAmount'];
    for (const field of requiredFields) {
      if (!record[field] || record[field].trim() === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    const nationality = record.nationality.trim();
    const destination = record.destination.trim();
    const productName = record.productName.trim();
    const duration = parseInt(record.duration, 10);
    const validity = parseInt(record.validity, 10);
    const entryType = record.entryType.trim().toLowerCase();
    const customEntryName = record.customEntryName?.trim() || null;
    const govtFee = parseFloat(record.govtFee);
    const serviceFee = parseFloat(record.serviceFee);
    const totalAmount = parseFloat(record.totalAmount);
    const isFreeVisa = record.isFreeVisa?.toLowerCase() === 'true' || false;
    const processingFeesStr = record.processingFees?.trim() || '';

    // Validate entry type
    if (!['single', 'multiple', 'custom'].includes(entryType)) {
      throw new Error(`Invalid entryType: ${entryType}. Must be 'single', 'multiple', or 'custom'`);
    }

    if (entryType === 'custom' && !customEntryName) {
      throw new Error('customEntryName is required when entryType is "custom"');
    }

    // Validate numeric fields
    if (isNaN(duration) || duration < 1) {
      throw new Error(`Invalid duration: ${record.duration}`);
    }
    if (isNaN(validity) || validity < 1) {
      throw new Error(`Invalid validity: ${record.validity}`);
    }
    if (isNaN(govtFee) || govtFee < 0) {
      throw new Error(`Invalid govtFee: ${record.govtFee}`);
    }
    if (isNaN(serviceFee) || serviceFee < 0) {
      throw new Error(`Invalid serviceFee: ${record.serviceFee}`);
    }
    if (isNaN(totalAmount) || totalAmount < 0) {
      throw new Error(`Invalid totalAmount: ${record.totalAmount}`);
    }

    // Check if nationality exists
    const country = await this.countryRepo.findOne({
      where: { countryName: nationality },
    });
    if (!country) {
      throw new Error(`Nationality "${nationality}" does not exist in countries table`);
    }

    // Find or create visa product
    let visaProduct = await this.visaProductRepo.findOne({
      where: { country: destination, productName },
    });

    if (!visaProduct) {
      // Create new visa product
      visaProduct = this.visaProductRepo.create({
        country: destination,
        productName,
        duration,
        validity,
        entryType,
        customEntryName,
        govtFee,
        serviceFee,
        totalAmount,
      });
      visaProduct = await this.visaProductRepo.save(visaProduct);
      stats.visaProductsCreated++;

      // Parse and create processing fees if provided
      if (processingFeesStr) {
        const processingFees = this.parseProcessingFees(processingFeesStr);
        if (processingFees.length > 0 && visaProduct) {
          const productId = visaProduct.id;
          const fees = processingFees.map((fee) =>
            this.processingFeeRepo.create({
              ...fee,
              visaProductId: productId,
            }),
          );
          await this.processingFeeRepo.save(fees);
        }
      }
    } else {
      stats.visaProductsReused++;
    }

    // Check if nationality record already exists
    const existingNationality = await this.nationalityRepo.findOne({
      where: {
        nationality,
        destination,
        productName,
      },
    });

    if (!existingNationality) {
      // Create nationality record
      const nationalityRecord = this.nationalityRepo.create({
        nationality,
        destination,
        productName,
        govtFee: govtFee || null,
        serviceFee: serviceFee || null,
        totalAmount: totalAmount || null,
        isFreeVisa,
      } as Partial<Nationality>);
      await this.nationalityRepo.save(nationalityRecord);
      stats.nationalitiesCreated++;
    }
  }

  /**
   * Process a row in compact format (multiple products per row)
   */
  private async processCompactFormatRow(
    record: any,
    row: number,
    errors: Array<{ row: number; error: string }>,
    stats: { visaProductsCreated: number; visaProductsReused: number; nationalitiesCreated: number },
  ): Promise<void> {
    // Validate required fields
    if (!record.nationality || !record.destination || !record.products) {
      throw new Error('Missing required fields: nationality, destination, or products');
    }

    const nationality = record.nationality.trim();
    const destination = record.destination.trim();
    const productsStr = record.products.trim();

    // Check if nationality exists
    const country = await this.countryRepo.findOne({
      where: { countryName: nationality },
    });
    if (!country) {
      throw new Error(`Nationality "${nationality}" does not exist in countries table`);
    }

    // Parse products (semicolon-separated)
    const productStrings = productsStr.split(';').map((p: string) => p.trim()).filter((p: string) => p.length > 0);

    if (productStrings.length === 0) {
      throw new Error('No products found in products column');
    }

    // Process each product
    for (let j = 0; j < productStrings.length; j++) {
      const productStr = productStrings[j];
      try {
        // Parse product: productName:duration:validity:entryType:customEntryName:govtFee:serviceFee:totalAmount:isFreeVisa:processingFees
        const parts = productStr.split(':');
        if (parts.length < 9) {
          throw new Error(`Invalid product format. Expected at least 9 colon-separated values, got ${parts.length}`);
        }

        const productName = parts[0].trim();
        const duration = parseInt(parts[1], 10);
        const validity = parseInt(parts[2], 10);
        const entryType = parts[3].trim().toLowerCase();
        const customEntryName = parts[4]?.trim() || null;
        const govtFee = parseFloat(parts[5]);
        const serviceFee = parseFloat(parts[6]);
        const totalAmount = parseFloat(parts[7]);
        const isFreeVisa = parts[8]?.toLowerCase() === 'true' || false;
        const processingFeesStr = parts.slice(9).join(':') || ''; // Rejoin in case processing fees contain colons

        // Validate entry type
        if (!['single', 'multiple', 'custom'].includes(entryType)) {
          throw new Error(`Invalid entryType: ${entryType}. Must be 'single', 'multiple', or 'custom'`);
        }

        if (entryType === 'custom' && !customEntryName) {
          throw new Error('customEntryName is required when entryType is "custom"');
        }

        // Validate numeric fields
        if (isNaN(duration) || duration < 1) {
          throw new Error(`Invalid duration: ${parts[1]}`);
        }
        if (isNaN(validity) || validity < 1) {
          throw new Error(`Invalid validity: ${parts[2]}`);
        }
        if (isNaN(govtFee) || govtFee < 0) {
          throw new Error(`Invalid govtFee: ${parts[5]}`);
        }
        if (isNaN(serviceFee) || serviceFee < 0) {
          throw new Error(`Invalid serviceFee: ${parts[6]}`);
        }
        if (isNaN(totalAmount) || totalAmount < 0) {
          throw new Error(`Invalid totalAmount: ${parts[7]}`);
        }

        // Find or create visa product
        let visaProduct = await this.visaProductRepo.findOne({
          where: { country: destination, productName },
        });

        if (!visaProduct) {
          // Create new visa product
          visaProduct = this.visaProductRepo.create({
            country: destination,
            productName,
            duration,
            validity,
            entryType,
            customEntryName,
            govtFee,
            serviceFee,
            totalAmount,
          });
          visaProduct = await this.visaProductRepo.save(visaProduct);
          stats.visaProductsCreated++;

          // Parse and create processing fees if provided
          if (processingFeesStr) {
            const processingFees = this.parseProcessingFees(processingFeesStr);
            if (processingFees.length > 0 && visaProduct) {
              const productId = visaProduct.id;
              const fees = processingFees.map((fee) =>
                this.processingFeeRepo.create({
                  ...fee,
                  visaProductId: productId,
                }),
              );
              await this.processingFeeRepo.save(fees);
            }
          }
        } else {
          stats.visaProductsReused++;
        }

        // Check if nationality record already exists
        const existingNationality = await this.nationalityRepo.findOne({
          where: {
            nationality,
            destination,
            productName,
          },
        });

        if (!existingNationality) {
          // Create nationality record
          const nationalityRecord = this.nationalityRepo.create({
            nationality,
            destination,
            productName,
            govtFee: govtFee || null,
            serviceFee: serviceFee || null,
            totalAmount: totalAmount || null,
            isFreeVisa,
          } as Partial<Nationality>);
          await this.nationalityRepo.save(nationalityRecord);
          stats.nationalitiesCreated++;
        }
      } catch (error) {
        throw new Error(`Error processing product ${j + 1}: ${error.message}`);
      }
    }
  }

  /**
   * Parse processing fees string
   * Format: feeType:timeValue:timeUnit:amount|feeType:timeValue:timeUnit:amount|...
   */
  private parseProcessingFees(processingFeesStr: string): Array<{
    feeType: string;
    timeValue: number;
    timeUnit: string;
    amount: number;
  }> {
    if (!processingFeesStr || processingFeesStr.trim() === '') {
      return [];
    }

    const fees: Array<{ feeType: string; timeValue: number; timeUnit: string; amount: number }> = [];
    const feeStrings = processingFeesStr.split('|').map((f: string) => f.trim()).filter((f: string) => f.length > 0);

    for (const feeStr of feeStrings) {
      const parts = feeStr.split(':');
      if (parts.length !== 4) {
        continue; // Skip invalid format
      }

      const feeType = parts[0].trim();
      const timeValue = parseInt(parts[1], 10);
      const timeUnit = parts[2].trim().toLowerCase();
      const amount = parseFloat(parts[3]);

      if (!feeType || isNaN(timeValue) || timeValue < 1 || !['hours', 'days'].includes(timeUnit) || isNaN(amount) || amount < 0) {
        continue; // Skip invalid fee
      }

      fees.push({
        feeType,
        timeValue,
        timeUnit,
        amount,
      });
    }

    return fees;
  }
}
