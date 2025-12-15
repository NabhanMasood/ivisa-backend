import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { VisaProduct } from '../visa-product/entities/visa-product.entity';
import { Traveler } from '../travelers/entities/traveler.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Embassy } from '../embassies/entities/embassy.entity';
import { CreateVisaApplicationDto } from './dto/create-visa-application.dto';
import { UpdateVisaApplicationDto } from './dto/update-visa-application.dto';
import { SelectProcessingDto } from './dto/select-processing.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { SubmitCompleteApplicationDto } from './dto/submit-complete-application.dto';
import { CouponsService } from '../coupons/coupons.service';
import { CardInfoService } from '../card-info/card-info.service';
import { CardInfo } from '../card-info/entities/card-info.entity';
import { VisaApplication, ResubmissionRequest } from './entities/visa-application.entity';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class VisaApplicationsService {
  constructor(
    @InjectRepository(VisaApplication)
    private applicationRepo: Repository<VisaApplication>,
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
    @InjectRepository(VisaProduct)
    private visaProductRepo: Repository<VisaProduct>,
    @InjectRepository(Traveler)
    private travelerRepo: Repository<Traveler>,
    @InjectRepository(Embassy)
    private embassyRepo: Repository<Embassy>,
    private couponsService: CouponsService,
    private cardInfoService: CardInfoService,
    private emailService: EmailService,
    private configService: ConfigService,
    private settingsService: SettingsService,
  ) { }

  /**
   * Resolve the public frontend URL from environment variables.
   * Throws if FRONTEND_URL is not configured.
   */
  private getFrontendUrl(): string {
    const url = this.configService.get<string>('FRONTEND_URL');
    if (!url) {
      throw new BadRequestException(
        'FRONTEND_URL environment variable is not configured on the server.',
      );
    }
    return url.replace(/\/$/, '');
  }

  /**
   * Check if a visa product is an eVisa based on its product name
   * Checks for variations: "eVisa", "e-visa", "e visa", "evisa" (case-insensitive)
   */
  private isEVisa(productName: string): boolean {
    if (!productName) return false;
    const lowerName = productName.toLowerCase();
    // Check for various eVisa patterns
    return /e[\s-]?visa/i.test(lowerName) || lowerName.includes('evisa');
  }

  /**
   * Determine if embassy selection is required for a visa product
   * eVisa products do not require embassy selection
   */
  private requiresEmbassy(visaProduct: VisaProduct): boolean {
    if (!visaProduct || !visaProduct.productName) return true;
    return !this.isEVisa(visaProduct.productName);
  }

  /**
   * Normalize fieldResponses structure for backward compatibility
   * Migrates old nested structure to new flat structure
   * Returns Record with string keys to support both number and string field IDs
   */
  private normalizeApplicationFieldResponses(fieldResponses: any): Record<string, any> {
    if (!fieldResponses) {
      return {};
    }

    // If old nested structure, extract application-level responses
    if (
      typeof fieldResponses === 'object' &&
      ('application' in fieldResponses || 'travelers' in fieldResponses)
    ) {
      const appResponses = (fieldResponses as any).application || {};
      // Convert to string keys for consistency
      const normalized: Record<string, any> = {};
      Object.entries(appResponses).forEach(([key, value]) => {
        normalized[String(key)] = value;
      });
      return normalized;
    }

    // If already in flat structure, ensure keys are strings
    const normalized: Record<string, any> = {};
    Object.entries(fieldResponses).forEach(([key, value]) => {
      normalized[String(key)] = value;
    });
    return normalized;
  }

  /**
   * Generate unique application number
   * Format: VAP-YYYY-XXXXXX
   */
  private async generateApplicationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `VAP-${year}-`;

    // Get the last application number for this year
    const lastApplication = await this.applicationRepo
      .createQueryBuilder('app')
      .where('app.applicationNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('app.id', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastApplication) {
      const lastSequence = parseInt(
        lastApplication.applicationNumber.split('-')[2],
      );
      sequence = lastSequence + 1;
    }

    // Pad with zeros (6 digits)
    const paddedSequence = sequence.toString().padStart(6, '0');
    return `${prefix}${paddedSequence}`;
  }

  /**
   * Create a new visa application (Step 1 - Trip Info)
   * Status: draft
   */
  async create(createDto: CreateVisaApplicationDto) {
    try {
      // Validate customer exists
      const customer = await this.customerRepo.findOne({
        where: { id: createDto.customerId },
      });
      if (!customer) {
        throw new NotFoundException(
          `Customer with ID ${createDto.customerId} not found`,
        );
      }

      // Validate visa product exists
      const visaProduct = await this.visaProductRepo.findOne({
        where: { id: createDto.visaProductId },
      });
      if (!visaProduct) {
        throw new NotFoundException(
          `Visa product with ID ${createDto.visaProductId} not found`,
        );
      }

      // Embassy selection is now handled in the additional info form, not during application creation
      // No embassy validation here - embassy will be selected later

      // Generate application number
      const applicationNumber = await this.generateApplicationNumber();

      // Calculate fees
      const governmentFee =
        createDto.governmentFee ||
        visaProduct.govtFee * createDto.numberOfTravelers;
      const serviceFee =
        createDto.serviceFee ||
        visaProduct.serviceFee * createDto.numberOfTravelers;
      const processingFee = createDto.processingFee || 0;
      const totalAmount = governmentFee + serviceFee + processingFee;

      // Extract travelers and draftData from DTO (if provided) before creating application
      // Also exclude embassyId - embassy selection is handled in additional info form, not during creation
      const { travelers, draftData, currentStep, embassyId, ...applicationData } = createDto;

      // Create application
      const application = this.applicationRepo.create({
        ...applicationData,
        applicationNumber,
        embassyId: null, // Embassy selection is handled later in additional info form
        governmentFee,
        serviceFee,
        processingFee,
        processingFeeId: createDto.processingFeeId || null,
        processingType: createDto.processingType || null,
        processingTime: createDto.processingTime || null,
        totalAmount,
        status: 'draft',
        // Capture email if provided for pending reminders
        emailCaptured: createDto.email || customer.email || null,
        emailCapturedAt: (createDto.email || customer.email) ? new Date() : null,
        // Store draft data if provided
        draftData: draftData || null,
        currentStep: currentStep || draftData?.currentStep || 1, // Default to step 1
      } as Partial<VisaApplication>);

      const result = await this.applicationRepo.save(application);

      // Save travelers if provided
      if (travelers && travelers.length > 0) {
        // Validate number of travelers matches
        if (travelers.length > result.numberOfTravelers) {
          throw new BadRequestException(
            `Number of travelers (${travelers.length}) exceeds specified numberOfTravelers (${result.numberOfTravelers})`,
          );
        }

        // Create travelers (only save if required fields are present)
        const travelerEntities = travelers
          .filter((t) => t.firstName && t.lastName && t.dateOfBirth) // Only save travelers with required fields
          .map((travelerDto) =>
            this.travelerRepo.create({
              applicationId: result.id,
              firstName: travelerDto.firstName,
              lastName: travelerDto.lastName,
              email: travelerDto.email,
              dateOfBirth: new Date(travelerDto.dateOfBirth!),
              passportNationality: travelerDto.passportNationality,
              passportNumber: travelerDto.passportNumber,
              passportExpiryDate: travelerDto.passportExpiryDate
                ? new Date(travelerDto.passportExpiryDate)
                : undefined,
              residenceCountry: travelerDto.residenceCountry,
              hasSchengenVisa: travelerDto.hasSchengenVisa || false,
              placeOfBirth: travelerDto.placeOfBirth,
              notes: travelerDto.notes,
            }),
          );

        if (travelerEntities.length > 0) {
          await this.travelerRepo.save(travelerEntities);
        }
      }

      return {
        status: true,
        message: 'Visa application created successfully',
        data: {
          id: result.id,
          applicationNumber: result.applicationNumber,
          customerId: result.customerId,
          nationality: result.nationality,
          destinationCountry: result.destinationCountry,
          visaType: result.visaType,
          numberOfTravelers: result.numberOfTravelers,
          phoneNumber: result.phoneNumber,
          governmentFee: result.governmentFee,
          serviceFee: result.serviceFee,
          totalAmount: result.totalAmount,
          status: result.status,
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error creating visa application',
      );
    }
  }

  /**
   * Get all visa applications with optional search
   */
  async findAll(search?: string) {
    try {
      const query = this.applicationRepo
        .createQueryBuilder('app')
        .leftJoinAndSelect('app.customer', 'customer')
        .leftJoinAndSelect('app.visaProduct', 'visaProduct')
        .leftJoinAndSelect('app.travelers', 'travelers');

      if (search) {
        query.where(
          '(app.applicationNumber ILIKE :search OR app.destinationCountry ILIKE :search OR customer.fullname ILIKE :search)',
          { search: `%${search}%` },
        );
      }

      const applications = await query.getMany();

      const formattedApplications = applications.map((app) => ({
        id: app.id,
        applicationNumber: app.applicationNumber,
        customer: {
          id: app.customer?.id || null,
          fullname: app.customer?.fullname || '',
          email: app.customer?.email || '',
          nationality: app.customer?.nationality || null,
          passportNumber: app.customer?.passportNumber || null,
          dateOfBirth: app.customer?.dateOfBirth || null,
          phoneNumber: app.customer?.phoneNumber || null,
        },
        destinationCountry: app.destinationCountry,
        visaType: app.visaType,
        numberOfTravelers: app.numberOfTravelers,
        phoneNumber: app.phoneNumber,
        processingType: app.processingType || null,
        processingTime: app.processingTime || null,
        processingFee: parseFloat(app.processingFee?.toString() || '0'),
        totalAmount: parseFloat(app.totalAmount.toString()),
        status: app.status,
        createdAt: app.createdAt.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
      }));

      return {
        status: true,
        message: 'Visa applications retrieved successfully',
        count: formattedApplications.length,
        data: formattedApplications,
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Error fetching visa applications',
      );
    }
  }

  /**
   * Get a single visa application by application number (for tracking)
   */
  async findByApplicationNumber(applicationNumber: string) {
    try {
      const application = await this.applicationRepo.findOne({
        where: { applicationNumber },
        relations: ['customer', 'visaProduct', 'travelers', 'payment', 'embassy'],
      });

      if (!application) {
        throw new NotFoundException(
          `Visa application with number ${applicationNumber} not found`,
        );
      }

      // Use the same formatting logic as findOne
      return this.formatApplicationDetails(application);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error fetching visa application',
      );
    }
  }

  /**
   * Format application details (used by findOne and findByApplicationNumber)
   */
  private formatApplicationDetails(application: VisaApplication) {
    // Find customer traveler record if it exists (created when addPassportDetailsLater is true)
    // ✅ CRITICAL: When numberOfTravelers > 1, traveler 1 is ALWAYS the customer (primary applicant)
    // However, traveler 1 might not have a Traveler record if there was an issue during submission
    // Check: If numberOfTravelers > travelers.length, then traveler 1 is missing

    let customerTravelerRecord: Traveler | null = null;
    const travelersInDB = application.travelers?.length || 0;
    const expectedTravelers = application.numberOfTravelers || 0;
    const isTraveler1Missing = expectedTravelers > travelersInDB;

    console.log(`🔍 [TRAVELERS] Traveler count check: numberOfTravelers=${expectedTravelers}, travelersInDB=${travelersInDB}, isTraveler1Missing=${isTraveler1Missing}`);

    if (isTraveler1Missing) {
      // Traveler 1 is missing from Traveler records - we'll reconstruct from draft data
      console.log(`⚠️ [TRAVELERS] Traveler 1 is missing from Traveler records. Will reconstruct from draft data.`);
      customerTravelerRecord = null; // Explicitly set to null so we reconstruct
    } else if (application.travelers && application.travelers.length > 0) {
      // All travelers exist - identify traveler 1 by creation date
      // Sort travelers by createdAt to get them in creation order
      // The first created traveler is always traveler 1 (customer)
      const sortedTravelers = [...application.travelers].sort((a, b) => {
        const aDate = a.createdAt || new Date(0);
        const bDate = b.createdAt || new Date(0);
        return aDate.getTime() - bDate.getTime();
      });

      // The earliest traveler (by createdAt) is traveler 1 (customer)
      const earliestTraveler = sortedTravelers[0];

      // Also try email matching as secondary verification (but don't rely on it alone)
      const emailMatchedTraveler = application.travelers.find(
        (t) => t.email && application.customer?.email && t.email === application.customer.email
      );

      // Use email-matched traveler ONLY if it's also the earliest one
      // Otherwise, use the earliest one (correct traveler 1 identification)
      if (emailMatchedTraveler && emailMatchedTraveler.id === earliestTraveler.id) {
        customerTravelerRecord = emailMatchedTraveler;
        console.log(`✅ [TRAVELERS] Customer traveler identified by email AND creation date (ID: ${customerTravelerRecord.id})`);
      } else if (emailMatchedTraveler) {
        // Email matches a different traveler - this is wrong, use earliest instead
        console.log(`⚠️ [TRAVELERS] Email matched traveler ${emailMatchedTraveler.id}, but earliest traveler is ${earliestTraveler.id}. Using earliest (correct traveler 1).`);
        customerTravelerRecord = earliestTraveler;
      } else {
        // No email match - use earliest traveler (traveler 1)
        customerTravelerRecord = earliestTraveler;
        console.log(`✅ [TRAVELERS] Customer traveler identified by creation date only (ID: ${customerTravelerRecord.id})`);
      }
    } else if (application.numberOfTravelers === 1 && application.travelers?.length === 1) {
      // Only 1 traveler - it's definitely the customer
      customerTravelerRecord = application.travelers[0];
    }

    // ✅ CRITICAL: If numberOfTravelers = 1 and there's a customer Traveler record,
    // use that Traveler record as the only traveler (don't duplicate customer)
    let allTravelers: any[] = [];

    if (application.numberOfTravelers === 1 && customerTravelerRecord) {
      // Only 1 traveler and customer has a Traveler record: use the Traveler record
      allTravelers = [{
        id: customerTravelerRecord.id,
        firstName: customerTravelerRecord.firstName,
        lastName: customerTravelerRecord.lastName,
        fullName: `${customerTravelerRecord.firstName} ${customerTravelerRecord.lastName}`,
        email: customerTravelerRecord.email,
        dateOfBirth: customerTravelerRecord.dateOfBirth,
        passportNationality: customerTravelerRecord.passportNationality,
        passportNumber: customerTravelerRecord.passportNumber,
        passportExpiryDate: customerTravelerRecord.passportExpiryDate,
        residenceCountry: customerTravelerRecord.residenceCountry,
        hasSchengenVisa: customerTravelerRecord.hasSchengenVisa,
        receiveUpdates: customerTravelerRecord.receiveUpdates ?? false,
        placeOfBirth: customerTravelerRecord.placeOfBirth,
        notes: customerTravelerRecord.notes,
        fieldResponses: customerTravelerRecord.fieldResponses || {},
        isCustomer: true, // This is the customer
        customerId: application.customer?.id || null,
      }];
    } else if (application.numberOfTravelers === 1 && !customerTravelerRecord) {
      // Only 1 traveler and no Traveler record
      // ✅ Note: We can't reconstruct the traveler's actual name without Traveler record
      // The customer.fullname is the account username, not the traveler's name
      // For now, we'll use customer data but this is a limitation - ideally Traveler record should exist
      // In practice, if addPassportDetailsLater=false, a Traveler record might not exist
      // Check if we have any travelers in the array (shouldn't happen for numberOfTravelers=1 without customerTravelerRecord)
      const fallbackTraveler = application.travelers?.[0];

      const customerTraveler = application.customer ? {
        id: fallbackTraveler?.id || null,
        firstName: fallbackTraveler?.firstName || '', // ✅ Try to use Traveler record if it exists (even if not matched as customerTravelerRecord)
        lastName: fallbackTraveler?.lastName || '', // ✅ Try to use Traveler record if it exists
        fullName: fallbackTraveler ? `${fallbackTraveler.firstName} ${fallbackTraveler.lastName}` : '', // ✅ Use traveler name if available
        email: application.customer.email,
        dateOfBirth: fallbackTraveler?.dateOfBirth || application.customer.dateOfBirth,
        passportNationality: fallbackTraveler?.passportNationality || application.customer.passportNationality,
        passportNumber: fallbackTraveler?.passportNumber || application.customer.passportNumber,
        passportExpiryDate: fallbackTraveler?.passportExpiryDate || application.customer.passportExpiryDate,
        residenceCountry: fallbackTraveler?.residenceCountry || application.customer.residenceCountry,
        nationality: fallbackTraveler?.passportNationality || application.customer.nationality,
        hasSchengenVisa: fallbackTraveler?.hasSchengenVisa ?? application.customer.hasSchengenVisa,
        receiveUpdates: fallbackTraveler?.receiveUpdates ?? application.customer.receiveUpdates ?? false,
        placeOfBirth: fallbackTraveler?.placeOfBirth,
        notes: fallbackTraveler?.notes,
        fieldResponses: fallbackTraveler?.fieldResponses || {},
        isCustomer: true,
        customerId: application.customer.id,
      } : null;
      allTravelers = customerTraveler ? [customerTraveler] : [];
    } else {
      // Multiple travelers: customer is always traveler 1, then additional travelers

      // ✅ If customer has a Traveler record, use it as the customer traveler
      // Otherwise, reconstruct from customer data
      let customerTraveler: any = null;

      if (customerTravelerRecord) {
        // Customer has a Traveler record: use it directly
        customerTraveler = {
          id: customerTravelerRecord.id,
          firstName: customerTravelerRecord.firstName,
          lastName: customerTravelerRecord.lastName,
          fullName: `${customerTravelerRecord.firstName} ${customerTravelerRecord.lastName}`,
          email: customerTravelerRecord.email,
          dateOfBirth: customerTravelerRecord.dateOfBirth,
          passportNationality: customerTravelerRecord.passportNationality,
          passportNumber: customerTravelerRecord.passportNumber,
          passportExpiryDate: customerTravelerRecord.passportExpiryDate,
          residenceCountry: customerTravelerRecord.residenceCountry,
          nationality: customerTravelerRecord.passportNationality, // Use passportNationality as nationality
          hasSchengenVisa: customerTravelerRecord.hasSchengenVisa,
          receiveUpdates: customerTravelerRecord.receiveUpdates ?? false,
          placeOfBirth: customerTravelerRecord.placeOfBirth,
          notes: customerTravelerRecord.notes,
          fieldResponses: customerTravelerRecord.fieldResponses || {},
          isCustomer: true,
          customerId: application.customer?.id || null,
        };
      } else {
        // No Traveler record found for customer - reconstruct from draft data
        // ✅ Use draftData.step2.travelers[0] to get traveler 1's actual name
        const draftTraveler1 = application.draftData?.step2?.travelers?.[0];

        if (draftTraveler1 && application.customer) {
          // Reconstruct from draft data - this has the actual traveler name
          console.log(`✅ [TRAVELERS] Reconstructing traveler 1 from draft data:`, {
            firstName: draftTraveler1.firstName,
            lastName: draftTraveler1.lastName,
            email: draftTraveler1.email,
          });

          // Parse date of birth from draft data (format: birthDate, birthMonth, birthYear)
          let dateOfBirth: Date | null = null;
          if (draftTraveler1.birthYear && draftTraveler1.birthMonth && draftTraveler1.birthDate) {
            try {
              const year = parseInt(draftTraveler1.birthYear);
              const month = parseInt(draftTraveler1.birthMonth) - 1; // Month is 0-indexed
              const date = parseInt(draftTraveler1.birthDate);
              if (!isNaN(year) && !isNaN(month) && !isNaN(date)) {
                dateOfBirth = new Date(year, month, date);
                // Validate the date
                if (isNaN(dateOfBirth.getTime())) {
                  dateOfBirth = null;
                }
              }
            } catch (e) {
              console.warn(`⚠️ [TRAVELERS] Could not parse date of birth from draft data:`, e);
            }
          }

          // Get passport details from step3
          const draftPassport1 = application.draftData?.step3?.passportDetails?.[0];

          // Parse passport expiry date if available
          let passportExpiryDate: Date | null = null;
          if (draftPassport1?.expiryYear && draftPassport1?.expiryMonth && draftPassport1?.expiryDate) {
            try {
              const year = parseInt(draftPassport1.expiryYear);
              const month = parseInt(draftPassport1.expiryMonth) - 1;
              const date = parseInt(draftPassport1.expiryDate);
              if (!isNaN(year) && !isNaN(month) && !isNaN(date)) {
                passportExpiryDate = new Date(year, month, date);
                if (isNaN(passportExpiryDate.getTime())) {
                  passportExpiryDate = null;
                }
              }
            } catch (e) {
              console.warn(`⚠️ [TRAVELERS] Could not parse passport expiry date from draft data:`, e);
            }
          }

          customerTraveler = {
            id: null, // No Traveler record exists
            firstName: draftTraveler1.firstName || '', // ✅ Actual traveler name from draft
            lastName: draftTraveler1.lastName || '', // ✅ Actual traveler name from draft
            fullName: `${draftTraveler1.firstName || ''} ${draftTraveler1.lastName || ''}`.trim(), // ✅ Actual traveler name
            email: draftTraveler1.email || application.customer.email,
            dateOfBirth: dateOfBirth || application.customer.dateOfBirth,
            passportNationality: draftPassport1?.nationality || application.customer.passportNationality,
            passportNumber: draftPassport1?.passportNumber || application.customer.passportNumber,
            passportExpiryDate: passportExpiryDate || application.customer.passportExpiryDate,
            residenceCountry: draftPassport1?.residenceCountry || application.customer.residenceCountry,
            nationality: draftPassport1?.nationality || application.customer.nationality,
            hasSchengenVisa: draftPassport1?.hasSchengenVisa === 'yes' || draftPassport1?.hasSchengenVisa === true || application.customer.hasSchengenVisa || false,
            receiveUpdates: draftTraveler1.receiveUpdates ?? application.customer.receiveUpdates ?? false,
            placeOfBirth: null,
            notes: null,
            fieldResponses: {}, // No field responses if no Traveler record
            isCustomer: true,
            customerId: application.customer.id,
          };
        } else if (application.customer) {
          // No draft data available - fallback to customer data (but we can't get traveler name)
          console.warn(`⚠️ [TRAVELERS] No Traveler record and no draft data for traveler 1. Cannot determine traveler name. Customer account name: ${application.customer.fullname}`);
          customerTraveler = {
            id: null,
            firstName: '', // ❌ Cannot determine - customer.fullname is account username, not traveler name
            lastName: '', // ❌ Cannot determine
            fullName: '', // ❌ Cannot determine
            email: application.customer.email,
            dateOfBirth: application.customer.dateOfBirth,
            passportNationality: application.customer.passportNationality,
            passportNumber: application.customer.passportNumber,
            passportExpiryDate: application.customer.passportExpiryDate,
            residenceCountry: application.customer.residenceCountry,
            nationality: application.customer.nationality,
            hasSchengenVisa: application.customer.hasSchengenVisa,
            receiveUpdates: application.customer.receiveUpdates ?? false,
            fieldResponses: {},
            isCustomer: true,
            customerId: application.customer.id,
          };
        }
      }

      // Exclude customer traveler from additional travelers
      // ✅ CRITICAL: Only exclude travelers if customerTravelerRecord exists (i.e., traveler 1 has a Traveler record)
      // If traveler 1 is missing (reconstructed from draft data), ALL existing Traveler records are additional travelers
      const additionalTravelers = (application.travelers || []).filter(
        (t) => {
          // Only exclude if customerTravelerRecord exists (traveler 1 has a Traveler record)
          // When traveler 1 is missing (customerTravelerRecord = null), ALL Traveler records are additional travelers
          if (customerTravelerRecord && t.id === customerTravelerRecord.id) {
            return false; // Exclude the customerTravelerRecord
          }
          // ✅ Don't exclude any travelers when traveler 1 is missing (isTraveler1Missing = true)
          // All existing Traveler records are additional travelers (travelers 2, 3, etc.)
          return true;
        }
      );

      console.log(`🔍 [TRAVELERS] Additional travelers after filtering: ${additionalTravelers.length}`, additionalTravelers.map(t => ({
        id: t.id,
        firstName: t.firstName,
        lastName: t.lastName,
      })));

      const formattedTravelers = additionalTravelers.map(traveler => ({
        id: traveler.id,
        firstName: traveler.firstName,
        lastName: traveler.lastName,
        fullName: `${traveler.firstName} ${traveler.lastName}`,
        email: traveler.email,
        dateOfBirth: traveler.dateOfBirth,
        passportNationality: traveler.passportNationality,
        passportNumber: traveler.passportNumber,
        passportExpiryDate: traveler.passportExpiryDate,
        residenceCountry: traveler.residenceCountry,
        hasSchengenVisa: traveler.hasSchengenVisa,
        receiveUpdates: traveler.receiveUpdates ?? false,
        placeOfBirth: traveler.placeOfBirth,
        notes: traveler.notes,
        fieldResponses: traveler.fieldResponses || {},
        isCustomer: false,
      }));

      // Combine customer (traveler 1) with additional travelers
      allTravelers = customerTraveler
        ? [customerTraveler, ...formattedTravelers]
        : formattedTravelers;

      console.log(`🔍 [TRAVELERS] Application ${application.id}: numberOfTravelers=${application.numberOfTravelers}, totalTravelersInDB=${application.travelers?.length || 0}, customerTravelerRecord=${customerTravelerRecord ? 'exists' : 'none'}, allTravelersCount=${allTravelers.length}`);
      console.log(`🔍 [TRAVELERS DETAIL] First traveler (customer traveler):`, allTravelers[0] ? {
        id: allTravelers[0].id,
        firstName: allTravelers[0].firstName,
        lastName: allTravelers[0].lastName,
        fullName: allTravelers[0].fullName,
        email: allTravelers[0].email,
        isCustomer: allTravelers[0].isCustomer,
      } : 'NONE');
      console.log(`🔍 [TRAVELERS DETAIL] All travelers summary:`, allTravelers.map((t, idx) => ({
        index: idx,
        id: t.id,
        firstName: t.firstName,
        lastName: t.lastName,
        fullName: t.fullName,
        isCustomer: t.isCustomer,
      })));
    }

    return {
      status: true,
      message: 'Visa application retrieved successfully',
      data: {
        id: application.id,
        applicationNumber: application.applicationNumber,
        customer: {
          id: application.customer?.id || null,
          fullname: application.customer?.fullname || '',
          email: application.customer?.email || '',
          nationality: application.customer?.nationality || null,
          passportNumber: application.customer?.passportNumber || null,
          passportNationality: application.customer?.passportNationality || null,
          passportExpiryDate: application.customer?.passportExpiryDate || null,
          dateOfBirth: application.customer?.dateOfBirth || null,
          residenceCountry: application.customer?.residenceCountry || null,
          phoneNumber: application.customer?.phoneNumber || null,
          status: application.customer?.status || null,
          createdAt: application.customer?.createdAt || null,
        },
        customerId: application.customerId,
        visaProductId: application.visaProductId,
        visaProductName: application.visaProduct?.productName || '',
        requiresEmbassy: application.visaProduct ? this.requiresEmbassy(application.visaProduct) : true,
        nationality: application.nationality,
        destinationCountry: application.destinationCountry,
        embassy: application.embassy ? {
          id: application.embassy.id,
          embassyName: application.embassy.embassyName,
          address: application.embassy.address,
          destinationCountry: application.embassy.destinationCountry,
          originCountry: application.embassy.originCountry,
        } : null,
        embassyId: application.embassyId || null,
        visaType: application.visaType,
        numberOfTravelers: application.numberOfTravelers,
        phoneNumber: application.phoneNumber,
        processingType: application.processingType,
        processingFee: parseFloat(application.processingFee.toString()),
        governmentFee: parseFloat(application.governmentFee.toString()),
        serviceFee: parseFloat(application.serviceFee.toString()),
        totalAmount: parseFloat(application.totalAmount.toString()),
        status: application.status,
        submittedAt: application.submittedAt,
        approvedAt: application.approvedAt,
        rejectionReason: application.rejectionReason,
        notes: application.notes,

        // ✅ Only include resubmission data when status is actually 'resubmission'
        // This prevents stale resubmission requests from showing notifications
        resubmissionRequests: application.status === 'resubmission' ? (application.resubmissionRequests || []) : [],

        resubmissionTarget: application.status === 'resubmission' ? (application.resubmissionTarget || undefined) : undefined,
        resubmissionTravelerId: application.status === 'resubmission' ? (application.resubmissionTravelerId || undefined) : undefined,
        requestedFieldIds: application.status === 'resubmission' ? (application.requestedFieldIds || undefined) : undefined,

        travelers: allTravelers, // ✅ Now includes fieldResponses for each traveler
        payment: application.payment || null,
        fieldResponses: (() => {
          // Get application-level responses
          const applicationResponses = this.normalizeApplicationFieldResponses(
            application.fieldResponses,
          );

          // Get traveler-specific responses from Traveler entities
          const travelerResponsesMap = new Map<number, any[]>();

          if (application.travelers && application.travelers.length > 0) {
            // Create field map for traveler responses (for consistency)
            const travelerFieldMap = new Map<number | string, any>();
            if (application.visaProduct?.fields) {
              application.visaProduct.fields.forEach((f: any) => {
                travelerFieldMap.set(f.id, f);
                travelerFieldMap.set(String(f.id), f);
              });
            }

            for (const traveler of application.travelers) {
              if (traveler.fieldResponses && Object.keys(traveler.fieldResponses).length > 0) {
                const responses = Object.entries(traveler.fieldResponses).map(
                  ([fieldIdKey, response]: [string, any]) => {
                    // Try to match field by both number and string
                    const fieldIdNum = parseInt(fieldIdKey, 10);
                    const field = travelerFieldMap.get(fieldIdNum) || travelerFieldMap.get(fieldIdKey);

                    return {
                      fieldId: isNaN(fieldIdNum) ? fieldIdKey : fieldIdNum,
                      field: field
                        ? {
                          id: field.id,
                          question: field.question,
                          fieldType: field.fieldType,
                          displayOrder: field.displayOrder || 0,
                        }
                        : null,
                      value: response.value,
                      filePath: response.filePath,
                      fileName: response.fileName,
                      fileSize: response.fileSize,
                      submittedAt: response.submittedAt,
                    };
                  },
                ).sort((a, b) => {
                  // Sort by field displayOrder for consistent ordering
                  const orderA = a.field?.displayOrder || 0;
                  const orderB = b.field?.displayOrder || 0;
                  return orderA - orderB;
                });
                travelerResponsesMap.set(traveler.id, responses);
              }
            }
          }

          // IMPORTANT: Iterate over FIELDS first (in displayOrder), then find responses
          // This ensures correct ordering even if responses were stored with wrong keys
          const fields = (application.visaProduct?.fields || []).filter(
            (f: any) => f.isActive !== false,
          ).sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));

          // Create response map for quick lookup
          const responseMap = new Map<string | number, any>();
          Object.entries(applicationResponses).forEach(([key, value]) => {
            responseMap.set(key, value);
            responseMap.set(parseInt(key, 10), value); // Also support number keys
          });

          // Check if responses are using sequential indices (1, 2, 3, ...) instead of field IDs
          const responseKeys = Object.keys(applicationResponses);
          const areSequentialIndices = responseKeys.every((key, index) => {
            const numKey = parseInt(key, 10);
            return !isNaN(numKey) && numKey === index + 1;
          }) && responseKeys.length > 0;

          // Build application responses array by iterating over fields
          const applicationResponsesArray = fields.map((field: any, index: number) => {
            let response: any = null;

            if (areSequentialIndices) {
              // WORKAROUND: If responses are stored with sequential indices, match by position
              // Response "1" maps to fields[0], "2" to fields[1], etc.
              const sequentialKey = String(index + 1);
              response = responseMap.get(sequentialKey) || responseMap.get(index + 1);
            } else {
              // Normal case: Try to find response by field.id (both string and number)
              response = responseMap.get(field.id) || responseMap.get(String(field.id));
            }

            if (response) {
              return {
                fieldId: field.id, // Always return actual field.id, not the stored key
                field: {
                  id: field.id,
                  question: field.question,
                  fieldType: field.fieldType,
                  displayOrder: field.displayOrder || 0,
                },
                value: response.value,
                filePath: response.filePath,
                fileName: response.fileName,
                fileSize: response.fileSize,
                submittedAt: response.submittedAt,
              };
            }
            return null;
          }).filter((r: any) => r !== null); // Remove fields without responses

          return {
            application: applicationResponsesArray,
            travelers: Array.from(travelerResponsesMap.entries()).map(
              ([travelerId, responses]) => ({
                travelerId,
                responses,
              }),
            ),
          };
        })(),
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
        // Include draft data for step-by-step saving
        draftData: application.draftData || {},
        currentStep: application.currentStep || application.draftData?.currentStep || null,
      },
    };
  }

  /**
   * Get a single visa application by ID
   */
  async findOne(id: number) {
    try {
      const application = await this.applicationRepo.findOne({
        where: { id },
        relations: ['customer', 'visaProduct', 'travelers', 'payment', 'embassy'],
      });

      if (!application) {
        throw new NotFoundException(
          `Visa application with ID ${id} not found`,
        );
      }

      return this.formatApplicationDetails(application);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error fetching visa application',
      );
    }
  }

  /**
   * Update a visa application (while in draft status)
   */
  async update(id: number, updateDto: UpdateVisaApplicationDto) {
    try {
      const application = await this.applicationRepo.findOne({
        where: { id },
        relations: ['visaProduct'],
      });

      if (!application) {
        throw new NotFoundException(
          `Visa application with ID ${id} not found`,
        );
      }

      // Don't allow updates to submitted/approved applications
      if (
        ['submitted', 'processing', 'approved'].includes(application.status)
      ) {
        throw new BadRequestException(
          `Cannot update application with status: ${application.status}`,
        );
      }

      // If visa product is changed, validate it exists
      if (updateDto.visaProductId) {
        const visaProduct = await this.visaProductRepo.findOne({
          where: { id: updateDto.visaProductId },
        });
        if (!visaProduct) {
          throw new NotFoundException(
            `Visa product with ID ${updateDto.visaProductId} not found`,
          );
        }
      }

      // Validate embassy exists if embassyId is provided
      if (updateDto.embassyId !== undefined) {
        if (updateDto.embassyId === null) {
          // Allow clearing embassy selection
          application.embassyId = null;
        } else {
          const embassy = await this.embassyRepo.findOne({
            where: { id: updateDto.embassyId },
          });
          if (!embassy) {
            throw new NotFoundException(
              `Embassy with ID ${updateDto.embassyId} not found`,
            );
          }
          application.embassyId = updateDto.embassyId;
        }
      }

      // Map kanban column values to actual backend statuses if status is being updated
      if (updateDto.status) {
        const statusMapping: Record<string, string> = {
          'pending': 'submitted',
          'in_process': 'processing',
        };
        if (statusMapping[updateDto.status]) {
          updateDto.status = statusMapping[updateDto.status];
        }
      }

      // Handle email capture for pending reminders
      if (updateDto.email) {
        // Only set emailCapturedAt if email is being set for the first time
        if (!application.emailCaptured) {
          application.emailCaptured = updateDto.email;
          application.emailCapturedAt = new Date();
        } else if (application.emailCaptured !== updateDto.email) {
          // Update email if it's different
          application.emailCaptured = updateDto.email;
          // Don't update emailCapturedAt if email was already captured
        }
      }

      // Extract travelers and draft data from updateDto before updating application
      const { email, travelers, draftData, currentStep, step1Data, step2Data, step3Data, step4Data, step5Data, ...restUpdateDto } = updateDto;

      // Handle draftData - merge with existing draftData instead of overwriting
      if (draftData || step1Data || step2Data || step3Data || step4Data || step5Data || currentStep !== undefined) {
        const existingDraftData = application.draftData || {};

        // If complete draftData is provided, merge it
        if (draftData) {
          application.draftData = {
            ...existingDraftData,
            ...draftData,
            // Preserve currentStep if not provided in new draftData
            currentStep: draftData.currentStep !== undefined ? draftData.currentStep : (existingDraftData.currentStep || currentStep),
          };
        } else {
          // If individual step data is provided, merge into draftData
          application.draftData = {
            ...existingDraftData,
            ...(step1Data && { step1: step1Data }),
            ...(step2Data && { step2: step2Data }),
            ...(step3Data && { step3: step3Data }),
            ...(step4Data && { step4: step4Data }),
            ...(step5Data && { step5: step5Data }),
            currentStep: currentStep !== undefined ? currentStep : existingDraftData.currentStep,
          };
        }

        // Also update the currentStep field directly for easy querying
        if (currentStep !== undefined) {
          application.currentStep = currentStep;
        } else if (application.draftData?.currentStep !== undefined) {
          application.currentStep = application.draftData.currentStep;
        }
      }

      // Update processing fields if provided
      if (restUpdateDto.processingType !== undefined) {
        application.processingType = restUpdateDto.processingType;
      }
      if (restUpdateDto.processingTime !== undefined) {
        application.processingTime = restUpdateDto.processingTime;
      }
      if (restUpdateDto.processingFee !== undefined) {
        application.processingFee = restUpdateDto.processingFee;
      }
      if (restUpdateDto.processingFeeId !== undefined) {
        application.processingFeeId = restUpdateDto.processingFeeId;
      }

      // Protect amount fields - never overwrite them once set (especially after payment)
      // Store current amount values before any updates
      const existingAmounts = {
        governmentFee: application.governmentFee,
        serviceFee: application.serviceFee,
        totalAmount: application.totalAmount,
        processingFee: application.processingFee,
      };

      console.log('🔒 [UPDATE PROTECTION] Current amounts before update:', {
        applicationId: application.id,
        status: application.status,
        governmentFee: existingAmounts.governmentFee,
        serviceFee: existingAmounts.serviceFee,
        totalAmount: existingAmounts.totalAmount,
        processingFee: existingAmounts.processingFee,
      });

      // Update application (exclude email, travelers, draft data, and amount fields from updateDto)
      Object.assign(application, restUpdateDto);

      // CRITICAL: Protect amount fields - never overwrite them if they're already set
      // Only recalculate fees for DRAFT applications, and only if amounts aren't already set
      const isDraft = application.status === 'draft';
      const totalAmountNum = Number(existingAmounts.totalAmount);
      const amountsAlreadySet =
        existingAmounts.totalAmount !== null &&
        existingAmounts.totalAmount !== undefined &&
        !isNaN(totalAmountNum) &&
        totalAmountNum > 0;

      console.log('🔒 [UPDATE PROTECTION] Amount protection check:', {
        isDraft,
        amountsAlreadySet,
        totalAmountValue: existingAmounts.totalAmount,
        totalAmountAsNumber: totalAmountNum,
      });

      if (isDraft && !amountsAlreadySet && (updateDto.numberOfTravelers || updateDto.processingFee !== undefined)) {
        // Only recalculate for draft applications without existing amounts
        if (application.visaProduct && application.visaProduct.govtFee && application.visaProduct.serviceFee) {
          const numTravelers = updateDto.numberOfTravelers || application.numberOfTravelers;
          const procFee = updateDto.processingFee !== undefined ? updateDto.processingFee : application.processingFee;

          const govtFee = Number(application.visaProduct.govtFee) * Number(numTravelers);
          const svcFee = Number(application.visaProduct.serviceFee) * Number(numTravelers);
          const total = govtFee + svcFee + Number(procFee || 0);

          application.governmentFee = govtFee;
          application.serviceFee = svcFee;
          application.totalAmount = total;

          console.log('🔒 [UPDATE PROTECTION] Recalculated amounts for draft:', {
            governmentFee: govtFee,
            serviceFee: svcFee,
            totalAmount: total,
          });
        }
      } else if (amountsAlreadySet) {
        // Restore original amounts if they were set - never overwrite paid amounts
        application.governmentFee = existingAmounts.governmentFee;
        application.serviceFee = existingAmounts.serviceFee;
        application.totalAmount = existingAmounts.totalAmount;
        application.processingFee = existingAmounts.processingFee;

        console.log('🔒 [UPDATE PROTECTION] Preserved existing amounts (payment already made):', {
          governmentFee: existingAmounts.governmentFee,
          serviceFee: existingAmounts.serviceFee,
          totalAmount: existingAmounts.totalAmount,
          processingFee: existingAmounts.processingFee,
        });
      }

      const result = await this.applicationRepo.save(application);

      // Handle travelers update if provided
      if (travelers !== undefined) {
        // Validate number of travelers matches
        if (travelers.length > result.numberOfTravelers) {
          throw new BadRequestException(
            `Number of travelers (${travelers.length}) exceeds specified numberOfTravelers (${result.numberOfTravelers})`,
          );
        }

        // Get existing travelers
        const existingTravelers = await this.travelerRepo.find({
          where: { applicationId: result.id },
        });

        // Delete existing travelers if we're replacing them
        if (existingTravelers.length > 0) {
          await this.travelerRepo.remove(existingTravelers);
        }

        // Create new travelers if provided (only save if required fields are present)
        if (travelers.length > 0) {
          const travelerEntities = travelers
            .filter((t) => t.firstName && t.lastName && t.dateOfBirth) // Only save travelers with required fields
            .map((travelerDto) =>
              this.travelerRepo.create({
                applicationId: result.id,
                firstName: travelerDto.firstName,
                lastName: travelerDto.lastName,
                email: travelerDto.email,
                dateOfBirth: new Date(travelerDto.dateOfBirth!),
                passportNationality: travelerDto.passportNationality,
                passportNumber: travelerDto.passportNumber,
                passportExpiryDate: travelerDto.passportExpiryDate
                  ? new Date(travelerDto.passportExpiryDate)
                  : undefined,
                residenceCountry: travelerDto.residenceCountry,
                hasSchengenVisa: travelerDto.hasSchengenVisa || false,
                placeOfBirth: travelerDto.placeOfBirth,
                notes: travelerDto.notes,
              }),
            );

          if (travelerEntities.length > 0) {
            await this.travelerRepo.save(travelerEntities);
          }
        }
      }

      return {
        status: true,
        message: 'Visa application updated successfully',
        data: result,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error updating visa application',
      );
    }
  }

  /**
   * Update application status only
   * Allows status updates for applications in certain states
   */
  async updateStatus(id: number, newStatus: string) {
    try {
      const application = await this.applicationRepo.findOne({
        where: { id },
      });

      if (!application) {
        throw new NotFoundException(
          `Visa application with ID ${id} not found`,
        );
      }

      // Get current status first
      const currentStatus = application.status;

      // Map kanban column values to actual backend statuses
      // Helper function to determine which kanban column a status belongs to
      const getKanbanCategory = (status: string): string => {
        const statusLower = status.toLowerCase().replace(/\s+/g, '_');

        // ✅ Check for kanban column values first (before checking actual statuses)
        if (statusLower === 'pending' || statusLower === 'in_process') {
          return statusLower; // Return the kanban column value as-is
        }

        // Then check actual backend statuses
        // Note: 'draft' is kept for backward compatibility but new applications won't use it
        if (['draft', 'submitted'].includes(statusLower)) return 'pending';
        if (['processing', 'under_review', 'additional_info_required', 'additional info required', 'resubmission'].includes(statusLower)) return 'in_process';
        if (['approved', 'completed'].includes(statusLower)) return 'completed';
        if (['rejected', 'cancelled'].includes(statusLower)) return 'rejected';
        return 'pending'; // default
      };

      // Determine target kanban category
      const targetCategory = getKanbanCategory(newStatus);
      const currentCategory = getKanbanCategory(currentStatus);

      // Map kanban column values to actual backend statuses
      let normalizedStatus = newStatus;

      // List of valid backend statuses (including kanban column values)
      // ✅ IMPORTANT: These are the actual status values used in the system
      // When frontend sends these exact values (e.g., "Additional Info required", "processing", "resubmission"),
      // they pass through unchanged - no mapping needed
      const validBackendStatuses = [
        'draft', 'submitted', 'resubmission', 'Additional Info required',
        'processing', 'under_review', 'approved', 'rejected', 'cancelled', 'completed',
        // Kanban column values - save these directly
        'pending', 'in_process'
      ];

      // ✅ If newStatus is already a valid backend status, use it directly (no mapping)
      // This preserves existing workflow: "Additional Info required" → "processing" → "resubmission" etc.
      if (validBackendStatuses.includes(newStatus)) {
        normalizedStatus = newStatus;
      } else if (targetCategory === 'pending') {
        // If moving within pending category, preserve the original status
        if (currentCategory === 'pending') {
          normalizedStatus = currentStatus; // Preserves existing pending status
        } else {
          // Moving from another category to pending, save as "pending" directly
          normalizedStatus = 'pending';
        }
      } else if (targetCategory === 'in_process') {
        // If moving within in_process category, preserve the original status
        if (currentCategory === 'in_process') {
          normalizedStatus = currentStatus; // Preserves "Additional Info required", "resubmission", etc.
        } else {
          // Moving from another category to in_process, save as "in_process" directly
          normalizedStatus = 'in_process';
        }
      } else if (targetCategory === 'completed') {
        // For completed, use 'completed' status
        normalizedStatus = 'completed';
      } else if (targetCategory === 'rejected') {
        // For rejected, use 'rejected' status
        normalizedStatus = 'rejected';
      }

      // ✅ ADMIN FULL CONTROL: Allow any valid status transition for admin operations
      // List of all valid backend statuses (including kanban column values)
      const validStatuses = [
        'draft',
        'submitted',
        'resubmission',
        'Additional Info required',
        'processing',
        'under_review',
        'approved',
        'rejected',
        'cancelled',
        'completed',
        // Kanban column values - these are now valid statuses
        'pending',
        'in_process',
      ];

      // ✅ ADD THIS: Allow idempotent updates (same status)
      if (currentStatus === normalizedStatus) {
        return {
          status: true,
          message: 'Application status is already set to the requested status',
          data: {
            id: application.id,
            applicationNumber: application.applicationNumber,
            status: application.status,
            previousStatus: currentStatus,
          },
        };
      }

      // Validate that the target status is a valid backend status
      if (!validStatuses.includes(normalizedStatus)) {
        throw new BadRequestException(
          `Invalid status: "${normalizedStatus}". Valid statuses are: ${validStatuses.join(', ')}`,
        );
      }

      // ✅ ADMIN FULL CONTROL: Allow any transition between valid statuses
      // No transition restrictions - admins can move applications to any status
      application.status = normalizedStatus;
      const result = await this.applicationRepo.save(application);

      // Send email notifications for specific status changes
      // Load customer information for email
      const applicationWithCustomer = await this.applicationRepo.findOne({
        where: { id: application.id },
        relations: ['customer'],
      });

      if (applicationWithCustomer?.customer?.email) {
        const frontendUrl = this.getFrontendUrl();
        const trackingUrl = `${frontendUrl}/track/${applicationWithCustomer.applicationNumber}`;

        // Send email based on new status (asynchronously)
        if (normalizedStatus === 'Additional Info required') {
          this.emailService.sendAdditionalInfoRequiredEmail(
            applicationWithCustomer.customer.email,
            applicationWithCustomer.customer.fullname,
            applicationWithCustomer.applicationNumber,
            trackingUrl,
            application.notes ?? undefined,
          ).catch(error => {
            console.error('Failed to send additional info required email:', error);
          });
        } else if (normalizedStatus === 'resubmission') {
          this.emailService.sendResubmissionRequiredEmail(
            applicationWithCustomer.customer.email,
            applicationWithCustomer.customer.fullname,
            applicationWithCustomer.applicationNumber,
            trackingUrl,
            application.notes ?? undefined,
          ).catch(error => {
            console.error('Failed to send resubmission required email:', error);
          });
        } else if (normalizedStatus === 'processing' || normalizedStatus === 'in_process') {
          this.emailService.sendApplicationProcessingEmail(
            applicationWithCustomer.customer.email,
            applicationWithCustomer.customer.fullname,
            applicationWithCustomer.applicationNumber,
            trackingUrl,
          ).catch(error => {
            console.error('Failed to send application processing email:', error);
          });
        } else if (normalizedStatus === 'completed') {
          this.emailService.sendApplicationCompletedEmail(
            applicationWithCustomer.customer.email,
            applicationWithCustomer.customer.fullname,
            applicationWithCustomer.applicationNumber,
            trackingUrl,
          ).catch(error => {
            console.error('Failed to send application completed email:', error);
          });
        } else if (normalizedStatus === 'rejected') {
          this.emailService.sendApplicationRejectedEmail(
            applicationWithCustomer.customer.email,
            applicationWithCustomer.customer.fullname,
            applicationWithCustomer.applicationNumber,
            application.rejectionReason || 'Application did not meet requirements',
            trackingUrl,
          ).catch(error => {
            console.error('Failed to send application rejected email:', error);
          });
        }
      }

      return {
        status: true,
        message: 'Application status updated successfully',
        data: {
          id: result.id,
          applicationNumber: result.applicationNumber,
          status: result.status,
          previousStatus: currentStatus,
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error updating application status',
      );
    }
  }

  /**
   * Select processing type (Step 4 - CheckoutForm.vue)
   */
  async selectProcessing(id: number, selectProcessingDto: SelectProcessingDto) {
    try {
      const application = await this.applicationRepo.findOne({
        where: { id },
      });

      if (!application) {
        throw new NotFoundException(
          `Visa application with ID ${id} not found`,
        );
      }

      // Update processing type and fee
      application.processingType = selectProcessingDto.processingType;
      application.processingFee = selectProcessingDto.processingFee;

      // Recalculate total amount
      application.totalAmount =
        application.governmentFee +
        application.serviceFee +
        application.processingFee;

      const result = await this.applicationRepo.save(application);

      return {
        status: true,
        message: 'Processing type selected successfully',
        data: {
          id: result.id,
          applicationNumber: result.applicationNumber,
          processingType: result.processingType,
          processingFee: parseFloat(result.processingFee.toString()),
          totalAmount: parseFloat(result.totalAmount.toString()),
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error selecting processing type',
      );
    }
  }

  /**
   * Submit application (Step 5 - after payment)
   */
  async submit(id: number, submitDto: SubmitApplicationDto) {
    try {
      const application = await this.applicationRepo.findOne({
        where: { id },
        relations: ['travelers', 'payment'],
      });

      if (!application) {
        throw new NotFoundException(
          `Visa application with ID ${id} not found`,
        );
      }

      // Validate application is complete
      if (!application.processingType) {
        throw new BadRequestException(
          'Please select a processing type before submitting',
        );
      }

      if (!application.travelers || application.travelers.length === 0) {
        throw new BadRequestException(
          'Please add traveler information before submitting',
        );
      }

      if (
        application.travelers.length !== application.numberOfTravelers
      ) {
        throw new BadRequestException(
          `Expected ${application.numberOfTravelers} travelers, but found ${application.travelers.length}`,
        );
      }

      // Check if payment exists and is completed
      if (!application.payment || application.payment.status !== 'completed') {
        throw new BadRequestException(
          'Payment must be completed before submitting application',
        );
      }

      // Update application status
      application.status = 'resubmission';
      application.submittedAt = new Date();
      if (submitDto.notes) {
        application.notes = submitDto.notes;
      }

      // Clear email tracking when application is submitted
      application.emailCaptured = null;
      application.emailCapturedAt = null;
      application.pendingReminderSentAt = null;
      application.couponEmailSentAt = null;

      const result = await this.applicationRepo.save(application);

      return {
        status: true,
        message: 'Visa application submitted successfully',
        data: {
          id: result.id,
          applicationNumber: result.applicationNumber,
          status: result.status,
          submittedAt: result.submittedAt,
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error submitting visa application',
      );
    }
  }

  /**
   * Delete a visa application (only if in draft status)
   */
  async remove(id: number) {
    try {
      const application = await this.applicationRepo.findOne({
        where: { id },
      });

      if (!application) {
        throw new NotFoundException(
          `Visa application with ID ${id} not found`,
        );
      }

      // Only allow deletion of draft or submitted (pending) applications
      if (!['draft', 'submitted'].includes(application.status)) {
        throw new BadRequestException(
          'Can only delete applications in draft or pending (submitted) status',
        );
      }

      await this.applicationRepo.remove(application);

      return {
        status: true,
        message: 'Visa application deleted successfully',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error deleting visa application',
      );
    }
  }

  /**
   * Get application summary statistics
   */
  async getSummary() {
    try {
      const [
        totalApplications,
        draftApplications,
        submittedApplications,
        processingApplications,
        approvedApplications,
        rejectedApplications,
        completedApplications,
      ] = await Promise.all([
        this.applicationRepo.count(),
        this.applicationRepo.count({ where: { status: 'draft' } }),
        // Count submitted (pending) applications - this is the default status for new applications
        this.applicationRepo.count({ where: { status: 'submitted' } }),
        this.applicationRepo.count({ where: { status: 'processing' } }),
        this.applicationRepo.count({ where: { status: 'approved' } }),
        this.applicationRepo.count({ where: { status: 'rejected' } }),
        this.applicationRepo.count({ where: { status: 'completed' } }),
      ]);

      return {
        status: true,
        message: 'Application summary retrieved successfully',
        data: {
          totalApplications,
          draftApplications,
          submittedApplications,
          processingApplications,
          approvedApplications,
          rejectedApplications,
          completedApplications,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Error fetching application summary',
      );
    }
  }

  /**
   * Get applications by customer ID
   */
  async findByCustomer(customerId: number, search?: string) {
    try {
      const query = this.applicationRepo
        .createQueryBuilder('app')
        .leftJoinAndSelect('app.visaProduct', 'visaProduct')
        .leftJoinAndSelect('app.customer', 'customer')
        .leftJoinAndSelect('app.travelers', 'travelers')
        .leftJoinAndSelect('app.payment', 'payment')
        .leftJoinAndSelect('app.embassy', 'embassy')
        .where('app.customerId = :customerId', { customerId });

      if (search) {
        query.andWhere(
          '(app.applicationNumber ILIKE :search OR app.destinationCountry ILIKE :search)',
          { search: `%${search}%` },
        );
      }

      const applications = await query
        .orderBy('app.createdAt', 'DESC')
        .getMany();

      // ✅ Format applications with reconstructed traveler data (like findOne does)
      const formattedApplications = applications.map((app) => {
        // Find customer traveler record if it exists (created when addPassportDetailsLater is true)
        // ✅ CRITICAL: When numberOfTravelers > 1, traveler 1 is ALWAYS the customer (primary applicant)
        // The correct way to identify traveler 1 is by creation date (earliest createdAt), NOT by email matching
        // Email matching can be unreliable because different travelers might use the same email

        let customerTravelerRecord: Traveler | null = null;

        if (app.travelers && app.travelers.length > 0) {
          // Sort travelers by createdAt to get them in creation order
          // The first created traveler is always traveler 1 (customer)
          const sortedTravelers = [...app.travelers].sort((a, b) => {
            const aDate = a.createdAt || new Date(0);
            const bDate = b.createdAt || new Date(0);
            return aDate.getTime() - bDate.getTime();
          });

          // The earliest traveler (by createdAt) is traveler 1 (customer)
          const earliestTraveler = sortedTravelers[0];

          // Also try email matching as secondary verification (but don't rely on it alone)
          const emailMatchedTraveler = app.travelers.find(
            (t) => t.email && app.customer?.email && t.email === app.customer.email
          );

          // Use email-matched traveler ONLY if it's also the earliest one
          // Otherwise, use the earliest one (correct traveler 1 identification)
          if (emailMatchedTraveler && emailMatchedTraveler.id === earliestTraveler.id) {
            customerTravelerRecord = emailMatchedTraveler;
          } else if (emailMatchedTraveler) {
            // Email matches a different traveler - this is wrong, use earliest instead
            customerTravelerRecord = earliestTraveler;
          } else {
            // No email match - use earliest traveler (traveler 1)
            customerTravelerRecord = earliestTraveler;
          }
        } else if (app.numberOfTravelers === 1 && app.travelers?.length === 1) {
          // Only 1 traveler - it's definitely the customer
          customerTravelerRecord = app.travelers[0];
        }

        // ✅ CRITICAL: If numberOfTravelers = 1 and there's a customer Traveler record,
        // use that Traveler record as the only traveler (don't duplicate customer)
        let allTravelers: any[] = [];

        if (app.numberOfTravelers === 1 && customerTravelerRecord) {
          // Only 1 traveler and customer has a Traveler record: use the Traveler record
          allTravelers = [{
            id: customerTravelerRecord.id,
            firstName: customerTravelerRecord.firstName,
            lastName: customerTravelerRecord.lastName,
            fullName: `${customerTravelerRecord.firstName} ${customerTravelerRecord.lastName}`,
            email: customerTravelerRecord.email,
            dateOfBirth: customerTravelerRecord.dateOfBirth,
            passportNationality: customerTravelerRecord.passportNationality,
            passportNumber: customerTravelerRecord.passportNumber,
            passportExpiryDate: customerTravelerRecord.passportExpiryDate,
            residenceCountry: customerTravelerRecord.residenceCountry,
            hasSchengenVisa: customerTravelerRecord.hasSchengenVisa,
            receiveUpdates: customerTravelerRecord.receiveUpdates ?? false,
            placeOfBirth: customerTravelerRecord.placeOfBirth,
            notes: customerTravelerRecord.notes,
            fieldResponses: customerTravelerRecord.fieldResponses || {},
            isCustomer: true,
            customerId: app.customer?.id || null,
          }];
        } else if (app.numberOfTravelers === 1 && !customerTravelerRecord) {
          // Only 1 traveler and no Traveler record: reconstruct from customer data
          const customerTraveler = app.customer ? {
            id: null,
            firstName: app.customer.fullname.split(' ')[0] || '',
            lastName: app.customer.fullname.split(' ').slice(1).join(' ') || '',
            fullName: app.customer.fullname,
            email: app.customer.email,
            dateOfBirth: app.customer.dateOfBirth,
            passportNationality: app.customer.passportNationality,
            passportNumber: app.customer.passportNumber,
            passportExpiryDate: app.customer.passportExpiryDate,
            residenceCountry: app.customer.residenceCountry,
            nationality: app.customer.nationality,
            hasSchengenVisa: app.customer.hasSchengenVisa,
            receiveUpdates: app.customer.receiveUpdates ?? false,
            fieldResponses: {},
            isCustomer: true,
            customerId: app.customer.id,
          } : null;
          allTravelers = customerTraveler ? [customerTraveler] : [];
        } else {
          // Multiple travelers: customer is always traveler 1, then additional travelers

          // ✅ If customer has a Traveler record, use it as the customer traveler
          // Otherwise, reconstruct from customer data
          let customerTraveler: any = null;

          if (customerTravelerRecord) {
            // Customer has a Traveler record: use it directly
            customerTraveler = {
              id: customerTravelerRecord.id,
              firstName: customerTravelerRecord.firstName,
              lastName: customerTravelerRecord.lastName,
              fullName: `${customerTravelerRecord.firstName} ${customerTravelerRecord.lastName}`,
              email: customerTravelerRecord.email,
              dateOfBirth: customerTravelerRecord.dateOfBirth,
              passportNationality: customerTravelerRecord.passportNationality,
              passportNumber: customerTravelerRecord.passportNumber,
              passportExpiryDate: customerTravelerRecord.passportExpiryDate,
              residenceCountry: customerTravelerRecord.residenceCountry,
              nationality: customerTravelerRecord.passportNationality, // Use passportNationality as nationality
              hasSchengenVisa: customerTravelerRecord.hasSchengenVisa,
              receiveUpdates: customerTravelerRecord.receiveUpdates ?? false,
              placeOfBirth: customerTravelerRecord.placeOfBirth,
              notes: customerTravelerRecord.notes,
              fieldResponses: customerTravelerRecord.fieldResponses || {},
              isCustomer: true,
              customerId: app.customer?.id || null,
            };
          } else if (app.customer) {
            // No Traveler record: try to find any traveler that might be the customer
            // ✅ Don't use customer.fullname (account username) - it's not the traveler's name
            const fallbackTraveler = app.travelers?.[0]; // First traveler might be the customer traveler

            customerTraveler = {
              id: fallbackTraveler?.id || null,
              firstName: fallbackTraveler?.firstName || '', // ✅ Use traveler name, not account name
              lastName: fallbackTraveler?.lastName || '', // ✅ Use traveler name, not account name
              fullName: fallbackTraveler ? `${fallbackTraveler.firstName} ${fallbackTraveler.lastName}` : '', // ✅ Use traveler name
              email: app.customer.email,
              dateOfBirth: fallbackTraveler?.dateOfBirth || app.customer.dateOfBirth,
              passportNationality: fallbackTraveler?.passportNationality || app.customer.passportNationality,
              passportNumber: fallbackTraveler?.passportNumber || app.customer.passportNumber,
              passportExpiryDate: fallbackTraveler?.passportExpiryDate || app.customer.passportExpiryDate,
              residenceCountry: fallbackTraveler?.residenceCountry || app.customer.residenceCountry,
              nationality: fallbackTraveler?.passportNationality || app.customer.nationality,
              hasSchengenVisa: fallbackTraveler?.hasSchengenVisa ?? app.customer.hasSchengenVisa,
              receiveUpdates: fallbackTraveler?.receiveUpdates ?? app.customer.receiveUpdates ?? false,
              placeOfBirth: fallbackTraveler?.placeOfBirth,
              notes: fallbackTraveler?.notes,
              fieldResponses: fallbackTraveler?.fieldResponses || {},
              isCustomer: true,
              customerId: app.customer.id,
            };
          }

          // Exclude customer traveler record from additional travelers if it was found
          const additionalTravelers = (app.travelers || []).filter(
            (t) => !customerTravelerRecord || t.id !== customerTravelerRecord.id
          );

          const formattedTravelers = additionalTravelers.map(traveler => ({
            id: traveler.id,
            firstName: traveler.firstName,
            lastName: traveler.lastName,
            fullName: `${traveler.firstName} ${traveler.lastName}`,
            email: traveler.email,
            dateOfBirth: traveler.dateOfBirth,
            passportNationality: traveler.passportNationality,
            passportNumber: traveler.passportNumber,
            passportExpiryDate: traveler.passportExpiryDate,
            residenceCountry: traveler.residenceCountry,
            hasSchengenVisa: traveler.hasSchengenVisa,
            receiveUpdates: traveler.receiveUpdates ?? false,
            placeOfBirth: traveler.placeOfBirth,
            notes: traveler.notes,
            fieldResponses: traveler.fieldResponses || {},
            isCustomer: false,
          }));

          // Combine customer (traveler 1) with additional travelers
          allTravelers = customerTraveler
            ? [customerTraveler, ...formattedTravelers]
            : formattedTravelers;
        }

        return {
          id: app.id,
          applicationNumber: app.applicationNumber,
          customer: {
            id: app.customer?.id || null,
            fullname: app.customer?.fullname || '',
            email: app.customer?.email || '',
            nationality: app.customer?.nationality || null,
            passportNumber: app.customer?.passportNumber || null,
            passportNationality: app.customer?.passportNationality || null,
            passportExpiryDate: app.customer?.passportExpiryDate || null,
            dateOfBirth: app.customer?.dateOfBirth || null,
            residenceCountry: app.customer?.residenceCountry || null,
            hasSchengenVisa: app.customer?.hasSchengenVisa || false,
            phoneNumber: app.customer?.phoneNumber || null,
            status: app.customer?.status || null,
            createdAt: app.customer?.createdAt || null,
          },
          customerId: app.customerId,
          visaProductId: app.visaProductId,
          visaProductName: app.visaProduct?.productName || '',
          requiresEmbassy: app.visaProduct ? this.requiresEmbassy(app.visaProduct) : true,
          nationality: app.nationality,
          destinationCountry: app.destinationCountry,
          embassy: app.embassy ? {
            id: app.embassy.id,
            embassyName: app.embassy.embassyName,
            address: app.embassy.address,
            destinationCountry: app.embassy.destinationCountry,
            originCountry: app.embassy.originCountry,
          } : null,
          embassyId: app.embassyId || null,
          visaType: app.visaType,
          numberOfTravelers: app.numberOfTravelers,
          phoneNumber: app.phoneNumber,
          processingType: app.processingType,
          processingFee: parseFloat(app.processingFee.toString()),
          governmentFee: parseFloat(app.governmentFee.toString()),
          serviceFee: parseFloat(app.serviceFee.toString()),
          totalAmount: parseFloat(app.totalAmount.toString()),
          status: app.status,
          submittedAt: app.submittedAt,
          approvedAt: app.approvedAt,
          rejectionReason: app.rejectionReason,
          notes: app.notes,

          // ✅ Only include resubmission data when status is actually 'resubmission'
          // This prevents stale resubmission requests from showing notifications
          resubmissionRequests: app.status === 'resubmission' ? (app.resubmissionRequests || []) : [],

          resubmissionTarget: app.status === 'resubmission' ? (app.resubmissionTarget || undefined) : undefined,
          resubmissionTravelerId: app.status === 'resubmission' ? (app.resubmissionTravelerId || undefined) : undefined,
          requestedFieldIds: app.status === 'resubmission' ? (app.requestedFieldIds || undefined) : undefined,

          travelers: allTravelers, // ✅ Traveler 1 (customer) + additional travelers
          payment: app.payment || null,
          fieldResponses: (() => {
            // Get application-level responses
            const applicationResponses = this.normalizeApplicationFieldResponses(
              app.fieldResponses,
            );

            // Get traveler-specific responses from Traveler entities
            const travelerResponsesMap = new Map<number, any[]>();

            if (app.travelers && app.travelers.length > 0) {
              for (const traveler of app.travelers) {
                if (traveler.fieldResponses && Object.keys(traveler.fieldResponses).length > 0) {
                  // Create field map for traveler responses too (for consistency)
                  const travelerFieldMap = new Map<number | string, any>();
                  if (app.visaProduct?.fields) {
                    app.visaProduct.fields.forEach((f: any) => {
                      travelerFieldMap.set(f.id, f);
                      travelerFieldMap.set(String(f.id), f);
                    });
                  }

                  const responses = Object.entries(traveler.fieldResponses).map(
                    ([fieldIdKey, response]: [string, any]) => {
                      // Try to match field by both number and string
                      const fieldIdNum = parseInt(fieldIdKey, 10);
                      const field = travelerFieldMap.get(fieldIdNum) || travelerFieldMap.get(fieldIdKey);

                      return {
                        fieldId: isNaN(fieldIdNum) ? fieldIdKey : fieldIdNum,
                        field: field
                          ? {
                            id: field.id,
                            question: field.question,
                            fieldType: field.fieldType,
                            displayOrder: field.displayOrder || 0,
                          }
                          : null,
                        value: response.value,
                        filePath: response.filePath,
                        fileName: response.fileName,
                        fileSize: response.fileSize,
                        submittedAt: response.submittedAt,
                      };
                    },
                  ).sort((a, b) => {
                    // Sort by field displayOrder for consistent ordering
                    const orderA = a.field?.displayOrder || 0;
                    const orderB = b.field?.displayOrder || 0;
                    return orderA - orderB;
                  });
                  travelerResponsesMap.set(traveler.id, responses);
                }
              }
            }



            // IMPORTANT: Iterate over FIELDS first (in displayOrder), then find responses
            // This ensures correct ordering even if responses were stored with wrong keys
            const fields = (app.visaProduct?.fields || []).filter(
              (f: any) => f.isActive !== false,
            ).sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));

            // Create response map for quick lookup
            const responseMap = new Map<string | number, any>();
            Object.entries(applicationResponses).forEach(([key, value]) => {
              responseMap.set(key, value);
              responseMap.set(parseInt(key, 10), value); // Also support number keys
            });

            // Check if responses are using sequential indices (1, 2, 3, ...) instead of field IDs
            const responseKeys = Object.keys(applicationResponses);
            const areSequentialIndices = responseKeys.every((key, index) => {
              const numKey = parseInt(key, 10);
              return !isNaN(numKey) && numKey === index + 1;
            }) && responseKeys.length > 0;

            // Build application responses array by iterating over fields
            const applicationResponsesArray = fields.map((field: any, index: number) => {
              let response: any = null;

              if (areSequentialIndices) {
                // WORKAROUND: If responses are stored with sequential indices, match by position
                // Response "1" maps to fields[0], "2" to fields[1], etc.
                const sequentialKey = String(index + 1);
                response = responseMap.get(sequentialKey) || responseMap.get(index + 1);
              } else {
                // Normal case: Try to find response by field.id (both string and number)
                response = responseMap.get(field.id) || responseMap.get(String(field.id));
              }

              if (response) {
                return {
                  fieldId: field.id, // Always return actual field.id, not the stored key
                  field: {
                    id: field.id,
                    question: field.question,
                    fieldType: field.fieldType,
                    displayOrder: field.displayOrder || 0,
                  },
                  value: response.value,
                  filePath: response.filePath,
                  fileName: response.fileName,
                  fileSize: response.fileSize,
                  submittedAt: response.submittedAt,
                };
              }
              return null;
            }).filter((r: any) => r !== null); // Remove fields without responses

            return {
              application: applicationResponsesArray,
              travelers: Array.from(travelerResponsesMap.entries()).map(
                ([travelerId, responses]) => ({
                  travelerId,
                  responses,
                }),
              ),
            };
          })(),
          createdAt: app.createdAt,
          updatedAt: app.updatedAt,
        };
      });

      return {
        status: true,
        message: 'Customer applications retrieved successfully',
        count: formattedApplications.length,
        data: formattedApplications
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to fetch customer applications',
      );
    }
  }

  /**
   * Submit complete application in one request
   * This creates: Application → Travelers → Payment → Submit all at once
   * Auto-creates customer from first traveler if customerId not provided
   */
  async submitComplete(submitDto: SubmitCompleteApplicationDto) {
    // Log received payload amounts for debugging
    console.log('💰 [SUBMIT COMPLETE] Received payload amounts:', {
      govtFee: submitDto.govtFee,
      serviceFee: submitDto.serviceFee,
      processingFee: submitDto.processingFee,
      totalAmount: submitDto.totalAmount,
      discountAmount: submitDto.discountAmount,
      couponCode: submitDto.couponCode,
      paymentAmount: submitDto.payment?.amount,
      paymentGateway: submitDto.payment?.paymentGateway,
      transactionId: submitDto.payment?.transactionId,
      paymentIntentId: submitDto.payment?.paymentIntentId,
    });

    // We'll use a transaction to ensure all or nothing
    const queryRunner = this.applicationRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate that we have at least one traveler (traveler 1 is the customer)
      if (!submitDto.travelers || submitDto.travelers.length === 0) {
        throw new BadRequestException(
          'At least one traveler (the customer) is required',
        );
      }

      const firstTraveler = submitDto.travelers[0]; // Traveler 1 is the customer
      const draftApplicationId = submitDto.applicationId;
      let draftApplication: VisaApplication | null = null;

      if (draftApplicationId) {
        draftApplication = await queryRunner.manager.findOne(VisaApplication, {
          where: { id: draftApplicationId },
          relations: ['travelers'],
        });

        if (!draftApplication) {
          throw new NotFoundException(
            `Draft visa application with ID ${draftApplicationId} not found`,
          );
        }

        if (draftApplication.status !== 'draft') {
          throw new BadRequestException(
            'Only draft visa applications can be finalized. Please restart the application.',
          );
        }
      }

      // Debug: Log receiveUpdates value from payload
      console.log('🔍 DEBUG: firstTraveler.receiveUpdates from payload:', firstTraveler.receiveUpdates, typeof firstTraveler.receiveUpdates);

      let customerId = submitDto.customerId;
      let customerWasCreated = false;
      let customer;

      // 1. Handle customer creation/update from traveler 1
      if (!customerId) {
        // Check if customer with this email already exists
        customer = await this.customerRepo.findOne({
          where: { email: firstTraveler.email },
        });

        if (customer) {
          customerId = customer.id;
          // Only update customer fields if they are currently null/undefined
          // This prevents overwriting existing data when creating new applications
          // Each application should be independent
          // ✅ Don't update customer.fullname from traveler data - customer account name is separate
          // Only set if it's truly empty (new customer with no account name set)
          // Customer account name should remain independent of traveler names
          if (!customer.fullname || customer.fullname.trim() === '') {
            // For new customers, we can set a default, but this should ideally come from account creation
            // For now, use traveler name only if customer name is completely empty
            customer.fullname = `${firstTraveler.firstName} ${firstTraveler.lastName}`;
          }
          // ❌ Removed: Don't update existing customer fullname - it's their account username
          // Email should not change (it's the unique identifier)
          if (!customer.residenceCountry) {
            customer.residenceCountry = firstTraveler.residenceCountry || undefined;
          }
          if (!customer.nationality) {
            customer.nationality = submitDto.nationality || firstTraveler.passportNationality || undefined;
          }
          if (!customer.passportNumber) {
            customer.passportNumber = firstTraveler.passportNumber || undefined;
          }
          if (!customer.passportNationality) {
            customer.passportNationality = firstTraveler.passportNationality || undefined;
          }
          if (!customer.passportExpiryDate) {
            customer.passportExpiryDate = firstTraveler.passportExpiryDate
              ? new Date(firstTraveler.passportExpiryDate)
              : undefined;
          }
          if (!customer.dateOfBirth) {
            customer.dateOfBirth = new Date(firstTraveler.dateOfBirth);
          }
          if (!customer.phoneNumber) {
            customer.phoneNumber = submitDto.phoneNumber || firstTraveler.phone || undefined;
          }
          if (customer.hasSchengenVisa === null || customer.hasSchengenVisa === undefined) {
            customer.hasSchengenVisa = firstTraveler.hasSchengenVisa !== undefined && firstTraveler.hasSchengenVisa !== null
              ? firstTraveler.hasSchengenVisa
              : false;
          }
          // receiveUpdates can be updated from any application
          customer.receiveUpdates = firstTraveler.receiveUpdates !== undefined ? firstTraveler.receiveUpdates : (customer.receiveUpdates ?? false);
          customer.status = customer.status || 'Active';
        } else {
          // Create new customer from traveler 1
          // ✅ Note: For new customers, we use traveler name as initial account name
          // But in the future, account name should be set separately during account creation
          const newCustomer = new Customer();
          newCustomer.fullname = `${firstTraveler.firstName} ${firstTraveler.lastName}`; // Initial name for new customer
          newCustomer.email = firstTraveler.email || '';
          newCustomer.residenceCountry = firstTraveler.residenceCountry || undefined;
          newCustomer.nationality = submitDto.nationality || firstTraveler.passportNationality;
          newCustomer.passportNumber = firstTraveler.passportNumber || undefined;
          newCustomer.passportNationality = firstTraveler.passportNationality;
          newCustomer.passportExpiryDate = firstTraveler.passportExpiryDate
            ? new Date(firstTraveler.passportExpiryDate)
            : undefined;
          newCustomer.dateOfBirth = new Date(firstTraveler.dateOfBirth);
          newCustomer.phoneNumber = submitDto.phoneNumber || firstTraveler.phone || undefined;
          newCustomer.hasSchengenVisa = firstTraveler.hasSchengenVisa !== undefined && firstTraveler.hasSchengenVisa !== null
            ? firstTraveler.hasSchengenVisa
            : false;
          newCustomer.receiveUpdates = firstTraveler.receiveUpdates !== undefined ? firstTraveler.receiveUpdates : false;
          newCustomer.status = 'Active';
          customer = newCustomer;
          customerWasCreated = true;
        }
      } else {
        // Customer ID provided, fetch and update customer with traveler 1's details
        customer = await this.customerRepo.findOne({
          where: { id: customerId },
        });
        if (!customer) {
          throw new NotFoundException(
            `Customer with ID ${customerId} not found`,
          );
        }
        // Only update customer fields if they are currently null/undefined
        // This prevents overwriting existing data when creating new applications
        // Each application should be independent
        // ✅ Don't update customer.fullname from traveler data - customer account name is separate
        // Only set if it's truly empty (new customer with no account name set)
        if (!customer.fullname || customer.fullname.trim() === '') {
          // For new customers, we can set a default, but this should ideally come from account creation
          customer.fullname = `${firstTraveler.firstName} ${firstTraveler.lastName}`;
        }
        // ❌ Removed: Don't update existing customer fullname - it's their account username
        // Email should not change (it's the unique identifier)
        if (!customer.residenceCountry) {
          customer.residenceCountry = firstTraveler.residenceCountry || undefined;
        }
        if (!customer.nationality) {
          customer.nationality = submitDto.nationality || firstTraveler.passportNationality || undefined;
        }
        if (!customer.passportNumber) {
          customer.passportNumber = firstTraveler.passportNumber || undefined;
        }
        if (!customer.passportNationality) {
          customer.passportNationality = firstTraveler.passportNationality || undefined;
        }
        if (!customer.passportExpiryDate) {
          customer.passportExpiryDate = firstTraveler.passportExpiryDate
            ? new Date(firstTraveler.passportExpiryDate)
            : undefined;
        }
        if (!customer.dateOfBirth) {
          customer.dateOfBirth = new Date(firstTraveler.dateOfBirth);
        }
        if (!customer.phoneNumber) {
          customer.phoneNumber = submitDto.phoneNumber || firstTraveler.phone || undefined;
        }
        if (customer.hasSchengenVisa === null || customer.hasSchengenVisa === undefined) {
          customer.hasSchengenVisa = firstTraveler.hasSchengenVisa !== undefined && firstTraveler.hasSchengenVisa !== null
            ? firstTraveler.hasSchengenVisa
            : false;
        }
        // receiveUpdates can be updated from any application
        customer.receiveUpdates = firstTraveler.receiveUpdates !== undefined ? firstTraveler.receiveUpdates : (customer.receiveUpdates ?? false);
      }

      // Save/update customer
      const savedCustomer = await queryRunner.manager.save(Customer, customer);
      customerId = savedCustomer.id;

      // If no draftId was provided, attempt to reuse the newest draft for this customer/product combo
      if (!draftApplication) {
        draftApplication = await queryRunner.manager.findOne(VisaApplication, {
          where: {
            customerId,
            visaProductId: submitDto.visaProductId,
            status: 'draft',
          },
          order: { updatedAt: 'DESC' },
        });
      }

      // 3. Validate visa product exists
      const visaProduct = await this.visaProductRepo.findOne({
        where: { id: submitDto.visaProductId },
      });
      if (!visaProduct) {
        throw new NotFoundException(
          `Visa product with ID ${submitDto.visaProductId} not found`,
        );
      }

      // Embassy selection is now handled in the additional info form, not during submission
      // No embassy validation here - embassy will be selected later if needed

      // Validate visaType - use draft's visaType if submitDto.visaType is empty
      let finalVisaType = submitDto.visaType;
      if ((!finalVisaType || finalVisaType.trim() === '') && draftApplication?.visaType) {
        finalVisaType = draftApplication.visaType;
      }

      // Final validation: visaType must be in the correct format
      if (!finalVisaType || finalVisaType.trim() === '') {
        throw new BadRequestException(
          'Visa type is required. Expected format: "{validity}-{entryType}" (e.g., "30-single", "90-multiple", "180-single", or custom entry names)',
        );
      }

      if (!/^\d+-.+$/.test(finalVisaType)) {
        throw new BadRequestException(
          `Invalid visa type: "${finalVisaType}". Expected format: "{validity}-{entryType}" (e.g., "30-single", "90-multiple", "180-single", or custom entry names)`,
        );
      }

      // 4. Validate number of travelers matches
      if (submitDto.travelers.length !== submitDto.numberOfTravelers) {
        throw new BadRequestException(
          `Number of travelers (${submitDto.travelers.length}) does not match numberOfTravelers (${submitDto.numberOfTravelers})`,
        );
      }

      // 6. Use fees from DTO (frontend calculated these, possibly with nationality-specific pricing)
      // The frontend sends govtFee and serviceFee which may already be multiplied by numberOfTravelers
      // and may include nationality-specific adjustments

      // Helper function to safely convert to number
      const toNumber = (value: any, fieldName: string, defaultValue: number = 0): number => {
        if (value === null || value === undefined || value === '') {
          return defaultValue;
        }
        const num = typeof value === 'string' ? parseFloat(value) : Number(value);
        if (isNaN(num)) {
          throw new BadRequestException(
            `Invalid ${fieldName}: "${value}". Must be a valid number.`,
          );
        }
        return num;
      };

      // Log received amounts for debugging
      console.log('💰 [AMOUNT EXTRACTION] Received amounts from payload:', {
        govtFee: submitDto.govtFee,
        serviceFee: submitDto.serviceFee,
        processingFee: submitDto.processingFee,
        totalAmount: submitDto.totalAmount,
        discountAmount: submitDto.discountAmount,
        couponCode: submitDto.couponCode,
        paymentAmount: submitDto.payment?.amount,
      });

      // Convert and validate all amounts - ensure they are proper numbers
      const governmentFee = toNumber(submitDto.govtFee, 'government fee');
      const serviceFee = toNumber(submitDto.serviceFee, 'service fee');
      const processingFee = toNumber(submitDto.processingFee, 'processing fee', 0);
      const discountAmount = toNumber(submitDto.discountAmount, 'discount amount', 0);
      const baseTotalAmount = governmentFee + serviceFee + processingFee;

      // Validate required fee fields
      if (governmentFee < 0) {
        throw new BadRequestException(
          `Invalid government fee: ${governmentFee}. Government fee must be >= 0.`,
        );
      }
      if (serviceFee < 0) {
        throw new BadRequestException(
          `Invalid service fee: ${serviceFee}. Service fee must be >= 0.`,
        );
      }

      // 7. Use the totalAmount from payload (already includes discount if applied)
      // This is the amount the frontend calculated after applying coupon discount
      // If totalAmount is missing, calculate it as fallback
      let totalAmount = toNumber(submitDto.totalAmount, 'total amount', baseTotalAmount - discountAmount);

      // If totalAmount wasn't provided or was invalid, use calculated value
      // (toNumber already handled the conversion, but check if original value was missing)
      if (submitDto.totalAmount === null || submitDto.totalAmount === undefined) {
        console.warn('⚠️ [AMOUNT EXTRACTION] totalAmount was missing, using calculated value');
        totalAmount = baseTotalAmount - discountAmount;
        console.log(`💰 [AMOUNT EXTRACTION] Calculated totalAmount: ${totalAmount} (base: ${baseTotalAmount}, discount: ${discountAmount})`);
      }

      // Validate that the totalAmount is reasonable (not less than 0, not more than base)
      if (totalAmount < 0) {
        throw new BadRequestException(`Total amount cannot be negative: ${totalAmount}`);
      }
      if (totalAmount > baseTotalAmount * 1.1) {
        // Allow 10% tolerance for rounding differences
        throw new BadRequestException(
          `Total amount (${totalAmount}) cannot exceed base amount (${baseTotalAmount}) by more than 10%`,
        );
      }

      console.log('💰 [AMOUNT EXTRACTION] Final amounts to be saved (as numbers):', {
        governmentFee,
        serviceFee,
        processingFee,
        totalAmount,
        baseTotalAmount,
        discountAmount,
        typeof_governmentFee: typeof governmentFee,
        typeof_serviceFee: typeof serviceFee,
        typeof_totalAmount: typeof totalAmount,
      });

      // 2. Create or update application (use customer's nationality from traveler 1)
      let savedApplication: VisaApplication;
      const submissionDate = new Date();

      if (draftApplication) {
        draftApplication.customerId = customerId!; // customerId is guaranteed to be set at this point
        draftApplication.visaProductId = submitDto.visaProductId;
        draftApplication.nationality = savedCustomer.nationality || submitDto.nationality;
        draftApplication.destinationCountry = submitDto.destinationCountry;
        draftApplication.embassyId = submitDto.embassyId ?? null;
        // Use the validated finalVisaType
        draftApplication.visaType = finalVisaType;
        draftApplication.numberOfTravelers = submitDto.numberOfTravelers;
        draftApplication.phoneNumber = savedCustomer.phoneNumber;
        draftApplication.processingType = submitDto.processingType ?? null;
        draftApplication.processingTime = submitDto.processingTime ?? null;
        draftApplication.processingFee = processingFee; // Use converted number
        draftApplication.processingFeeId = submitDto.processingFeeId ?? null;
        draftApplication.governmentFee = governmentFee; // Already converted to number
        draftApplication.serviceFee = serviceFee; // Already converted to number
        draftApplication.totalAmount = totalAmount; // Already converted to number
        draftApplication.status = 'Additional Info required';
        draftApplication.submittedAt = submissionDate;
        draftApplication.notes = submitDto.notes ?? null;
        draftApplication.emailCaptured = null;
        draftApplication.emailCapturedAt = null;
        draftApplication.pendingReminderSentAt = null;
        draftApplication.couponEmailSentAt = null;

        const saved = await queryRunner.manager.save(
          VisaApplication,
          draftApplication,
        );
        savedApplication = Array.isArray(saved) ? saved[0] : saved;
      } else {
        const applicationNumber = await this.generateApplicationNumber();
        const application = this.applicationRepo.create({
          applicationNumber,
          customerId: customerId!,
          visaProductId: submitDto.visaProductId,
          nationality: savedCustomer.nationality || submitDto.nationality,
          destinationCountry: submitDto.destinationCountry,
          embassyId: submitDto.embassyId ?? null,
          visaType: finalVisaType,
          numberOfTravelers: submitDto.numberOfTravelers,
          phoneNumber: savedCustomer.phoneNumber,
          processingType: submitDto.processingType ?? null,
          processingTime: submitDto.processingTime ?? null,
          processingFee: processingFee, // Use converted number
          processingFeeId: submitDto.processingFeeId ?? null,
          governmentFee: governmentFee, // Already converted to number
          serviceFee: serviceFee, // Already converted to number
          totalAmount: totalAmount, // Already converted to number, includes discount
          status: 'Additional Info required', // Default status when submitted
          submittedAt: submissionDate,
          notes: submitDto.notes ?? null,
          // Clear email tracking when application is submitted
          emailCaptured: null,
          emailCapturedAt: null,
          pendingReminderSentAt: null,
          couponEmailSentAt: null,
        });

        const saved = await queryRunner.manager.save(
          VisaApplication,
          application,
        );
        savedApplication = Array.isArray(saved) ? saved[0] : saved;
      }

      // 3. Create travelers - ONLY travelers 2+ (traveler 1 is the customer, stored in customer table)
      // Skip the first traveler since they are the customer
      await queryRunner.manager.delete(Traveler, { applicationId: savedApplication.id });
      const additionalTravelers = submitDto.travelers.slice(1).map((travelerData) => {
        const addPassportLater = travelerData.addPassportDetailsLater === true;

        // Initialize fieldResponses to store missing passport fields
        const fieldResponses: Record<string | number, any> = {};

        // If passport details are to be added later, add missing fields to fieldResponses
        if (addPassportLater) {
          // Add passport fields as special entries in fieldResponses for additional info form
          // Using special keys with underscore prefix to distinguish from regular visa product fields
          if (!travelerData.passportNumber) {
            fieldResponses['_passport_number'] = {
              value: '',
              submittedAt: null,
            };
          }
          if (!travelerData.passportExpiryDate) {
            fieldResponses['_passport_expiry_date'] = {
              value: '',
              submittedAt: null,
            };
          }
          if (!travelerData.residenceCountry) {
            fieldResponses['_residence_country'] = {
              value: '',
              submittedAt: null,
            };
          }
          if (travelerData.hasSchengenVisa === undefined || travelerData.hasSchengenVisa === null) {
            fieldResponses['_has_schengen_visa'] = {
              value: '',
              submittedAt: null,
            };
          }
        }

        const traveler = new Traveler();
        traveler.applicationId = savedApplication.id;
        traveler.firstName = travelerData.firstName;
        traveler.lastName = travelerData.lastName;
        traveler.email = (travelerData.email || undefined) as any;
        traveler.dateOfBirth = new Date(travelerData.dateOfBirth);
        traveler.passportNationality = (travelerData.passportNationality || undefined) as any; // Always required
        traveler.passportNumber = (travelerData.passportNumber || undefined) as any;
        traveler.passportExpiryDate = (travelerData.passportExpiryDate
          ? new Date(travelerData.passportExpiryDate)
          : undefined) as any;
        traveler.residenceCountry = (travelerData.residenceCountry || undefined) as any;
        traveler.hasSchengenVisa = travelerData.hasSchengenVisa !== undefined && travelerData.hasSchengenVisa !== null
          ? travelerData.hasSchengenVisa
          : false;
        traveler.receiveUpdates = travelerData.receiveUpdates !== undefined ? travelerData.receiveUpdates : false;
        traveler.placeOfBirth = (travelerData.placeOfBirth || undefined) as any;
        traveler.fieldResponses = Object.keys(fieldResponses).length > 0 ? fieldResponses : undefined;
        return traveler;
      });

      // Only save if there are additional travelers (travelers 2+)
      const savedTravelers: Traveler[] = additionalTravelers.length > 0
        ? await queryRunner.manager.save(Traveler, additionalTravelers)
        : [];

      // Handle customer (first traveler) - create Traveler record if passport details are missing
      const firstTravelerAddPassportLater = firstTraveler.addPassportDetailsLater === true;
      let customerTravelerRecord: Traveler | null = null; // Store customer traveler record if it exists

      if (firstTravelerAddPassportLater) {
        // Check if customer traveler already exists
        const existingCustomerTraveler = await queryRunner.manager.findOne(Traveler, {
          where: { applicationId: savedApplication.id },
          order: { createdAt: 'ASC' },
        });

        // Initialize fieldResponses for missing passport fields
        const customerFieldResponses: Record<string | number, any> = {};

        if (!firstTraveler.passportNumber) {
          customerFieldResponses['_passport_number'] = {
            value: '',
            submittedAt: null,
          };
        }
        if (!firstTraveler.passportExpiryDate) {
          customerFieldResponses['_passport_expiry_date'] = {
            value: '',
            submittedAt: null,
          };
        }
        if (!firstTraveler.residenceCountry) {
          customerFieldResponses['_residence_country'] = {
            value: '',
            submittedAt: null,
          };
        }
        if (firstTraveler.hasSchengenVisa === undefined || firstTraveler.hasSchengenVisa === null) {
          customerFieldResponses['_has_schengen_visa'] = {
            value: '',
            submittedAt: null,
          };
        }

        if (existingCustomerTraveler) {
          // Update existing customer traveler with fieldResponses
          existingCustomerTraveler.fieldResponses = {
            ...(existingCustomerTraveler.fieldResponses || {}),
            ...customerFieldResponses,
          };
          customerTravelerRecord = await queryRunner.manager.save(Traveler, existingCustomerTraveler);
        } else {
          // Create new Traveler record for customer
          const customerTraveler = new Traveler();
          customerTraveler.applicationId = savedApplication.id;
          customerTraveler.firstName = firstTraveler.firstName;
          customerTraveler.lastName = firstTraveler.lastName;
          customerTraveler.email = (firstTraveler.email || undefined) as any;
          customerTraveler.dateOfBirth = new Date(firstTraveler.dateOfBirth);
          customerTraveler.passportNationality = (firstTraveler.passportNationality || undefined) as any;
          customerTraveler.passportNumber = (firstTraveler.passportNumber || undefined) as any;
          customerTraveler.passportExpiryDate = (firstTraveler.passportExpiryDate
            ? new Date(firstTraveler.passportExpiryDate)
            : undefined) as any;
          customerTraveler.residenceCountry = (firstTraveler.residenceCountry || undefined) as any;
          customerTraveler.hasSchengenVisa = firstTraveler.hasSchengenVisa !== undefined && firstTraveler.hasSchengenVisa !== null
            ? firstTraveler.hasSchengenVisa
            : false;
          customerTraveler.receiveUpdates = firstTraveler.receiveUpdates !== undefined ? firstTraveler.receiveUpdates : false;
          customerTraveler.placeOfBirth = (firstTraveler.placeOfBirth || undefined) as any;
          customerTraveler.fieldResponses = Object.keys(customerFieldResponses).length > 0 ? customerFieldResponses : undefined;
          customerTravelerRecord = await queryRunner.manager.save(Traveler, customerTraveler);
        }
      } else {
        // Even if not adding passport later, check if a customer traveler record exists
        customerTravelerRecord = await queryRunner.manager.findOne(Traveler, {
          where: { applicationId: savedApplication.id },
          order: { createdAt: 'ASC' },
        });
      }

      // 10. Handle card info - either use saved card or save new card
      let cardInfoId: number | undefined = undefined;
      let cardholderName: string | undefined = undefined;
      let cardLast4: string | undefined = undefined;
      let cardBrand: string | undefined = undefined;

      if (submitDto.payment.cardInfoId) {
        // Using a saved card
        const cardInfo = await queryRunner.manager.findOne(CardInfo, {
          where: { id: submitDto.payment.cardInfoId, customerId: customerId },
        });
        if (!cardInfo) {
          throw new NotFoundException(
            `Card with ID ${submitDto.payment.cardInfoId} not found for this customer`,
          );
        }
        cardInfoId = cardInfo.id;
        cardholderName = cardInfo.cardholderName;
        cardLast4 = cardInfo.cardLast4;
        cardBrand = cardInfo.cardBrand;
      } else {
        // Using a new card - get details from payment DTO
        cardholderName = submitDto.payment.cardholderName || undefined;
        cardLast4 = submitDto.payment.cardLast4 || undefined;
        cardBrand = submitDto.payment.cardBrand || undefined;

        // If saveCard is true, save the card to card_info within the same transaction
        if (submitDto.payment.saveCard && cardholderName) {
          try {
            const newCard = queryRunner.manager.create(CardInfo, {
              customerId: customerId,
              cardholderName: cardholderName,
              cardLast4: cardLast4 || undefined,
              cardBrand: cardBrand || undefined,
              expiryMonth: submitDto.payment.expiryMonth,
              expiryYear: submitDto.payment.expiryYear,
              paymentMethodId: submitDto.payment.paymentMethodId,
              paymentGateway: submitDto.payment.paymentGateway || 'stripe',
              isActive: true,
              isDefault: false, // Don't set as default automatically
            });
            const savedCard = await queryRunner.manager.save(CardInfo, newCard);
            cardInfoId = savedCard.id;
          } catch (error) {
            // Log error but don't fail the payment if card saving fails
            console.error('Failed to save card:', error.message);
          }
        }
      }

      // 11. Create payment record with coupon information
      const paymentMetadata: Record<string, any> = {};
      if (submitDto.couponCode) {
        paymentMetadata.couponCode = submitDto.couponCode;
      }
      if (submitDto.discountAmount && submitDto.discountAmount > 0) {
        paymentMetadata.discountAmount = submitDto.discountAmount;
      }
      if (submitDto.couponCode || submitDto.discountAmount) {
        paymentMetadata.baseAmount = baseTotalAmount;
      }

      // Use payment.amount from payload if provided, otherwise use totalAmount
      // Ensure payment amount is a valid number
      let paymentAmount = totalAmount; // Default to totalAmount
      if (submitDto.payment?.amount !== null && submitDto.payment?.amount !== undefined) {
        paymentAmount = toNumber(submitDto.payment.amount, 'payment amount', totalAmount);
      }

      console.log('💰 [PAYMENT AMOUNT] Payment amount to be saved:', {
        fromPaymentDto: submitDto.payment?.amount,
        fromTotalAmount: totalAmount,
        finalPaymentAmount: paymentAmount,
        typeof_paymentAmount: typeof paymentAmount,
      });

      const payment = {
        applicationId: savedApplication.id,
        customerId: savedApplication.customerId, // Link to customer
        amount: paymentAmount, // Use payment.amount if provided, otherwise totalAmount
        currency: 'USD',
        paymentMethod: 'card',
        paymentGateway: submitDto.payment.paymentGateway || 'stripe',
        status: 'completed',
        transactionId: submitDto.payment.transactionId,
        paymentIntentId: submitDto.payment.paymentIntentId,
        cardInfoId: cardInfoId,
        cardholderName: cardholderName,
        cardLast4: cardLast4,
        cardBrand: cardBrand,
        paidAt: new Date(),
        metadata: Object.keys(paymentMetadata).length > 0 ? paymentMetadata : undefined,
      };

      const savedPayment = await queryRunner.manager.save(Payment, payment) as Payment;

      // Verify amounts were saved correctly
      console.log('💰 [AMOUNT VERIFICATION] Verifying saved amounts:', {
        applicationId: savedApplication.id,
        applicationTotalAmount: savedApplication.totalAmount,
        applicationGovernmentFee: savedApplication.governmentFee,
        applicationServiceFee: savedApplication.serviceFee,
        applicationProcessingFee: savedApplication.processingFee,
        paymentAmount: savedPayment.amount,
      });

      // 12. Increment coupon usage if a coupon was applied
      if (submitDto.couponCode) {
        try {
          await this.couponsService.incrementUsage(submitDto.couponCode);
        } catch (error) {
          // Log error but don't fail the transaction if coupon increment fails
          // The coupon was already validated and used, so we continue
          console.error(`Failed to increment coupon usage for ${submitDto.couponCode}:`, error.message);
        }
      }

      // 13. Commit transaction
      await queryRunner.commitTransaction();

      // Re-fetch application after commit to ensure amounts are persisted
      const finalApplication = await this.applicationRepo.findOne({
        where: { id: savedApplication.id },
      });

      if (finalApplication) {
        console.log('💰 [FINAL VERIFICATION] Application amounts after commit:', {
          applicationId: finalApplication.id,
          totalAmount: finalApplication.totalAmount,
          governmentFee: finalApplication.governmentFee,
          serviceFee: finalApplication.serviceFee,
          processingFee: finalApplication.processingFee,
        });

        // Update savedApplication with the re-fetched data to ensure we return the persisted values
        savedApplication = finalApplication;
      }

      const frontendUrl = this.getFrontendUrl();
      const trackingUrl = `${frontendUrl}/track/${savedApplication.applicationNumber}`;

      // Prepare payment details for invoice
      const paymentDetails = {
        governmentFee: parseFloat(savedApplication.governmentFee.toString()),
        serviceFee: parseFloat(savedApplication.serviceFee.toString()),
        processingFee: parseFloat(savedApplication.processingFee.toString()),
        totalAmount: parseFloat(savedApplication.totalAmount.toString()),
        discountAmount: submitDto.discountAmount || undefined,
        couponCode: submitDto.couponCode || undefined,
        paymentMethod: submitDto.payment.paymentGateway === 'stripe' ? 'Credit Card' : submitDto.payment.paymentGateway,
        transactionId: savedPayment.transactionId || undefined,
        paidAt: savedPayment.paidAt,
      };

      // Send email asynchronously (don't wait for it to complete)
      this.emailService.sendApplicationSubmittedEmail(
        savedCustomer.email,
        savedCustomer.fullname,
        savedApplication.applicationNumber,
        trackingUrl,
        paymentDetails,
      ).catch(error => {
        console.error('Failed to send application submitted email:', error);
      });

      // Reconstruct traveler 1 (the customer) from customer data
      // Determine receiveUpdates: prioritize saved customer value, then firstTraveler from payload, then default to false
      const receiveUpdatesValue = savedCustomer.receiveUpdates !== undefined && savedCustomer.receiveUpdates !== null
        ? Boolean(savedCustomer.receiveUpdates)
        : (firstTraveler.receiveUpdates !== undefined && firstTraveler.receiveUpdates !== null
          ? Boolean(firstTraveler.receiveUpdates)
          : false);

      // Debug: Log the final receiveUpdates value being returned
      console.log('🔍 DEBUG: savedCustomer.receiveUpdates:', savedCustomer.receiveUpdates);
      console.log('🔍 DEBUG: firstTraveler.receiveUpdates:', firstTraveler.receiveUpdates);
      console.log('🔍 DEBUG: Final receiveUpdatesValue for response:', receiveUpdatesValue);

      // ✅ Use traveler data for name - customer account name is separate from traveler name
      // If Traveler record exists, use that (it has the correct traveler name from the application)
      // Otherwise, use firstTraveler data (from the submitted payload)
      const customerTravelerFirstName = customerTravelerRecord?.firstName || firstTraveler.firstName;
      const customerTravelerLastName = customerTravelerRecord?.lastName || firstTraveler.lastName;

      const customerTraveler = {
        id: customerTravelerRecord?.id || null, // Include traveler ID if Traveler record exists
        firstName: customerTravelerFirstName, // ✅ Use traveler's name, NOT customer account name
        lastName: customerTravelerLastName, // ✅ Use traveler's name, NOT customer account name
        email: savedCustomer.email,
        dateOfBirth: customerTravelerRecord?.dateOfBirth || savedCustomer.dateOfBirth || new Date(firstTraveler.dateOfBirth),
        passportNationality: customerTravelerRecord?.passportNationality || savedCustomer.passportNationality,
        passportNumber: customerTravelerRecord?.passportNumber || savedCustomer.passportNumber,
        passportExpiryDate: customerTravelerRecord?.passportExpiryDate || savedCustomer.passportExpiryDate,
        residenceCountry: customerTravelerRecord?.residenceCountry || savedCustomer.residenceCountry,
        hasSchengenVisa: customerTravelerRecord?.hasSchengenVisa ?? savedCustomer.hasSchengenVisa ?? firstTraveler.hasSchengenVisa,
        receiveUpdates: receiveUpdatesValue, // Always explicitly set as boolean
        placeOfBirth: customerTravelerRecord?.placeOfBirth || firstTraveler.placeOfBirth,
        fieldResponses: customerTravelerRecord?.fieldResponses || {}, // Include fieldResponses if Traveler record exists
      };

      return {
        status: true,
        message: 'Application submitted successfully',
        data: {
          customer: {
            id: savedCustomer.id,
            fullname: savedCustomer.fullname,
            email: savedCustomer.email,
            nationality: savedCustomer.nationality,
            passportNumber: savedCustomer.passportNumber,
            passportNationality: savedCustomer.passportNationality,
            passportExpiryDate: savedCustomer.passportExpiryDate,
            dateOfBirth: savedCustomer.dateOfBirth,
            residenceCountry: savedCustomer.residenceCountry,
            phoneNumber: savedCustomer.phoneNumber,
            receiveUpdates: savedCustomer.receiveUpdates !== undefined && savedCustomer.receiveUpdates !== null
              ? Boolean(savedCustomer.receiveUpdates)
              : (firstTraveler.receiveUpdates !== undefined && firstTraveler.receiveUpdates !== null
                ? Boolean(firstTraveler.receiveUpdates)
                : false),
            status: savedCustomer.status,
          },
          customerId: customerId,
          application: {
            id: savedApplication.id,
            applicationNumber: savedApplication.applicationNumber,
            status: savedApplication.status,
            governmentFee: parseFloat(savedApplication.governmentFee.toString()),
            serviceFee: parseFloat(savedApplication.serviceFee.toString()),
            processingFee: parseFloat(savedApplication.processingFee.toString()),
            totalAmount: parseFloat(savedApplication.totalAmount.toString()),
            discountAmount: submitDto.discountAmount || undefined,
            couponCode: submitDto.couponCode || undefined,
            submittedAt: savedApplication.submittedAt,
          },
          // Traveler 1 (customer) + additional travelers - ALL with IDs
          travelers: [
            customerTraveler, // Traveler 1 (the customer) - now includes id if Traveler record exists
            ...savedTravelers.map((t) => ({
              id: t.id, // ✅ Include traveler ID
              firstName: t.firstName,
              lastName: t.lastName,
              email: t.email,
              dateOfBirth: t.dateOfBirth,
              passportNationality: t.passportNationality,
              passportNumber: t.passportNumber,
              passportExpiryDate: t.passportExpiryDate,
              residenceCountry: t.residenceCountry,
              hasSchengenVisa: t.hasSchengenVisa,
              receiveUpdates: t.receiveUpdates ?? false,
              placeOfBirth: t.placeOfBirth,
              fieldResponses: t.fieldResponses || {}, // Include fieldResponses
            })),
          ],
          payment: {
            id: savedPayment.id,
            amount: parseFloat(savedPayment.amount.toString()),
            status: savedPayment.status,
            transactionId: savedPayment.transactionId,
          },
        },
      };
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error submitting complete application',
      );
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }
  /**
   * Admin: request resubmission from customer with a note
   * Moves status back to "Additional Info required" and stores the note
   */
  /**
   * Admin: request resubmission from customer with a note
   * Moves status back to "resubmission" and stores the note
   */
  /**
   * Request resubmission (supports both Option A and Option B)
   * Now supports creating new custom fields specific to this user
   * @param applicationId - Application ID
   * @param requests - Array of resubmission requests (can be single or multiple)
   *                   Each request can include:
   *                   - fieldIds: existing field IDs from visa product (positive numbers)
   *                   - newFields: new custom fields to create (will get negative IDs, unique to this application)
   */
  async requestResubmission(
    applicationId: number,
    requests: Array<{
      target: 'application' | 'traveler';
      travelerId?: number | string | null; // Can be number, string (for temp-traveler-0), or null
      fieldIds?: number[]; // Existing field IDs from visa product
      newFields?: Array<{ // New custom fields to create for this user only
        fieldType: string;
        question: string;
        placeholder?: string;
        isRequired?: boolean;
        options?: string[];
        allowedFileTypes?: string[];
        maxFileSizeMB?: number;
        minLength?: number;
        maxLength?: number;
      }>;
      note?: string;
    }>
  ) {
    try {
      const application = await this.applicationRepo.findOne({
        where: { id: applicationId },
        relations: ['travelers'],
      });

      if (!application) {
        throw new NotFoundException(
          `Application with ID ${applicationId} not found`,
        );
      }

      // ✅ Handle temp-traveler-0 (traveler 1) mapping BEFORE validation
      // Map "temp-traveler-0" to actual traveler 1 ID, or null if traveler 1 has no Traveler record
      const travelersInDB = application.travelers?.length || 0;
      const isTraveler1Missing = application.numberOfTravelers > travelersInDB;

      for (const request of requests) {
        if (request.target === 'traveler' && request.travelerId) {
          // Check if it's a temp traveler ID (string starting with "temp-traveler-")
          if (typeof request.travelerId === 'string' && request.travelerId.startsWith('temp-traveler-')) {
            const originalTravelerId = request.travelerId;
            console.log(`🔍 [RESUBMISSION] Received temp-traveler ID: ${originalTravelerId}. numberOfTravelers=${application.numberOfTravelers}, travelersInDB=${travelersInDB}, isTraveler1Missing=${isTraveler1Missing}`);

            if (isTraveler1Missing) {
              // Traveler 1 doesn't have a Traveler record - use null for application-level
              request.travelerId = null as any;
              console.log(`✅ [RESUBMISSION] Traveler 1 is missing from DB. Mapped ${originalTravelerId} to null (application-level).`);
            } else if (application.travelers && application.travelers.length > 0) {
              // Traveler 1 exists in DB - find the earliest traveler (traveler 1)
              const sortedTravelers = [...application.travelers].sort((a, b) => {
                const aDate = a.createdAt || new Date(0);
                const bDate = b.createdAt || new Date(0);
                return aDate.getTime() - bDate.getTime();
              });

              const earliestTraveler = sortedTravelers[0];
              if (earliestTraveler) {
                request.travelerId = earliestTraveler.id as any; // Map to actual numeric ID
                console.log(`✅ [RESUBMISSION] Mapped ${originalTravelerId} to actual traveler 1 ID: ${earliestTraveler.id}`);
              } else {
                // Should not happen, but fallback
                request.travelerId = null as any;
                console.log(`⚠️ [RESUBMISSION] No earliest traveler found. Mapped ${originalTravelerId} to null.`);
              }
            } else {
              // No travelers in DB at all - traveler 1 doesn't have a Traveler record
              request.travelerId = null as any;
              console.log(`⚠️ [RESUBMISSION] No travelers in DB. Traveler 1 has no Traveler record. Mapped ${originalTravelerId} to null.`);
            }
          } else {
            // Try to parse as number if it's a string
            if (typeof request.travelerId === 'string') {
              const parsedId = parseInt(request.travelerId, 10);
              if (!isNaN(parsedId)) {
                request.travelerId = parsedId as any;
              } else {
                throw new BadRequestException(
                  `Invalid travelerId format: ${request.travelerId}. Must be a number or 'temp-traveler-0'`
                );
              }
            }
          }
        }
      }

      // ✅ Normalize travelerId types after mapping (ensure they're number | null | undefined)
      for (const request of requests) {
        if (request.target === 'traveler' && request.travelerId) {
          // Convert to number if it's still a string (shouldn't happen after mapping, but just in case)
          if (typeof request.travelerId === 'string') {
            if (request.travelerId.startsWith('temp-traveler-')) {
              // This shouldn't happen - temp IDs should have been mapped already
              console.warn(`⚠️ [RESUBMISSION] Found unmapped temp-traveler ID: ${request.travelerId}`);
              request.travelerId = null as any;
            } else {
              const parsed = parseInt(request.travelerId, 10);
              request.travelerId = isNaN(parsed) ? null : (parsed as any);
            }
          }
        }
      }

      // Validate travelers exist (after mapping temp IDs)
      // Note: travelerId can be null/undefined for traveler 1 who doesn't have a Traveler record
      for (const request of requests) {
        if (request.target === 'traveler' && request.travelerId !== null && request.travelerId !== undefined) {
          // Ensure travelerId is a number for validation
          const travelerIdNum = typeof request.travelerId === 'number' ? request.travelerId : parseInt(String(request.travelerId), 10);
          if (isNaN(travelerIdNum)) {
            throw new BadRequestException(`Invalid travelerId: ${request.travelerId}`);
          }

          const traveler = application.travelers?.find(
            (t) => t.id === travelerIdNum
          );
          if (!traveler) {
            throw new NotFoundException(
              `Traveler with ID ${travelerIdNum} not found for this application`
            );
          }

          // Normalize the type to number
          request.travelerId = travelerIdNum as any;
        } else if (request.target === 'traveler' && (request.travelerId === null || request.travelerId === undefined)) {
          // Traveler 1 without a Traveler record - this is valid
          console.log(`✅ [RESUBMISSION] Traveler 1 (customer) has no Traveler record - using null travelerId (application-level)`);
          request.travelerId = null as any; // Ensure it's null, not undefined
        }
      }

      // Process each request: create new fields if provided, then build resubmission requests
      const processedRequests: ResubmissionRequest[] = [];
      const allFieldIds: number[] = [];

      for (const req of requests) {
        const fieldIds: number[] = [...(req.fieldIds || [])];

        // ✅ NEW: Create new custom fields if provided
        if (req.newFields && req.newFields.length > 0) {
          // Initialize admin fields storage if needed
          if (!application.adminRequestedFields) {
            application.adminRequestedFields = [];
          }
          if (
            application.adminRequestedFieldMinId === undefined ||
            application.adminRequestedFieldMinId === null ||
            application.adminRequestedFieldMinId >= 0
          ) {
            application.adminRequestedFieldMinId = 0;
          }

          // Create each new field and get its negative ID
          for (const newField of req.newFields) {
            application.adminRequestedFieldMinId =
              (application.adminRequestedFieldMinId || 0) - 1;
            const adminField = {
              id: application.adminRequestedFieldMinId, // negative number
              fieldType: newField.fieldType,
              question: newField.question,
              placeholder: newField.placeholder,
              isRequired: newField.isRequired ?? false,
              options: newField.options,
              allowedFileTypes: newField.allowedFileTypes,
              maxFileSizeMB: newField.maxFileSizeMB,
              minLength: newField.minLength,
              maxLength: newField.maxLength,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              travelerId: req.target === 'traveler' && req.travelerId !== null && req.travelerId !== undefined
                ? (typeof req.travelerId === 'number' ? req.travelerId : parseInt(String(req.travelerId), 10))
                : undefined, // undefined for application-level or when travelerId is null
              source: 'admin',
            };
            application.adminRequestedFields.push(adminField);
            fieldIds.push(adminField.id); // Add the negative ID to the fieldIds array

            console.log(`✅ [RESUBMISSION] Created admin field:`, {
              id: adminField.id,
              question: adminField.question,
              fieldType: adminField.fieldType,
              travelerId: adminField.travelerId,
            });
          }

          console.log(`✅ [RESUBMISSION] Total admin fields in application:`, application.adminRequestedFields.length);
          console.log(`✅ [RESUBMISSION] Admin fields details:`, application.adminRequestedFields.map((f: any) => ({
            id: f.id,
            question: f.question,
            fieldType: f.fieldType,
            travelerId: f.travelerId,
          })));
        }

        // Generate unique ID for this request
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Normalize travelerId to number | null
        let normalizedTravelerId: number | null = null;
        if (req.travelerId !== null && req.travelerId !== undefined) {
          if (typeof req.travelerId === 'number') {
            normalizedTravelerId = req.travelerId;
          } else if (typeof req.travelerId === 'string') {
            const parsed = parseInt(req.travelerId, 10);
            normalizedTravelerId = isNaN(parsed) ? null : parsed;
          }
        }

        const resubmissionRequest: ResubmissionRequest = {
          id: requestId,
          target: req.target,
          travelerId: normalizedTravelerId,
          fieldIds: fieldIds, // Includes both existing field IDs and newly created negative IDs
          note: req.note || null,
          requestedAt: new Date().toISOString(),
          fulfilledAt: null,
        };

        processedRequests.push(resubmissionRequest);
        allFieldIds.push(...fieldIds);
      }

      // Store requests
      application.resubmissionRequests = processedRequests;
      application.status = 'resubmission';

      // ✅ BACKWARD COMPATIBILITY: Also set old fields for Option A (single request)
      if (processedRequests.length === 1) {
        application.resubmissionTarget = requests[0].target;
        // Normalize travelerId for backward compatibility
        let normalizedTravelerId: number | null = null;
        if (requests[0].travelerId !== null && requests[0].travelerId !== undefined) {
          if (typeof requests[0].travelerId === 'number') {
            normalizedTravelerId = requests[0].travelerId;
          } else if (typeof requests[0].travelerId === 'string') {
            const parsed = parseInt(requests[0].travelerId, 10);
            normalizedTravelerId = isNaN(parsed) ? null : parsed;
          }
        }
        application.resubmissionTravelerId = normalizedTravelerId;
        application.requestedFieldIds = processedRequests[0].fieldIds;
      } else {
        // Multiple requests - clear old fields
        application.resubmissionTarget = null;
        application.resubmissionTravelerId = null;
        application.requestedFieldIds = null;
      }

      // ✅ Ensure TypeORM detects the change by creating a new array reference
      // This is important for JSON columns in TypeORM
      if (application.adminRequestedFields) {
        application.adminRequestedFields = [...application.adminRequestedFields];
      }

      console.log(`💾 [RESUBMISSION] Saving application ${application.id} with ${application.adminRequestedFields?.length || 0} admin fields`);

      const savedApplication = await this.applicationRepo.save(application);

      // Verify the save worked
      console.log(`✅ [RESUBMISSION] Application saved. Admin fields count: ${savedApplication.adminRequestedFields?.length || 0}`);
      if (savedApplication.adminRequestedFields && savedApplication.adminRequestedFields.length > 0) {
        console.log(`✅ [RESUBMISSION] Saved admin fields:`, savedApplication.adminRequestedFields.map((f: any) => ({
          id: f.id,
          question: f.question,
        })));
      }

      // Send resubmission email notification to customer
      // Load customer information for email
      const applicationWithCustomer = await this.applicationRepo.findOne({
        where: { id: application.id },
        relations: ['customer'],
      });

      if (applicationWithCustomer?.customer?.email) {
        const frontendUrl = this.getFrontendUrl();
        const trackingUrl = `${frontendUrl}/track/${applicationWithCustomer.applicationNumber}`;

        // Get notes from resubmission requests (use first request's note or combine all notes)
        const notes = processedRequests
          .map(req => req.note)
          .filter(note => note && note.trim())
          .join('\n\n') || application.notes;

        // Send email asynchronously
        this.emailService.sendResubmissionRequiredEmail(
          applicationWithCustomer.customer.email,
          applicationWithCustomer.customer.fullname,
          applicationWithCustomer.applicationNumber,
          trackingUrl,
          notes || undefined,
        ).catch(error => {
          console.error('Failed to send resubmission required email:', error);
        });
      }

      return {
        status: true,
        message: 'Resubmission requested successfully',
        data: {
          applicationId: application.id,
          requests: processedRequests,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error requesting resubmission'
      );
    }
  }

  /**
   * Get active (unfulfilled) resubmission requests for an application
   */
  async getActiveResubmissionRequests(applicationId: number) {
    const application = await this.applicationRepo.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException(
        `Application with ID ${applicationId} not found`
      );
    }

    const activeRequests =
      application.resubmissionRequests?.filter(
        (req) => !req.fulfilledAt
      ) || [];

    return {
      status: true,
      data: activeRequests,
    };
  }

  /**
   * Get all resubmission requests for an application (including fulfilled ones)
   * Enriched with field definitions from adminRequestedFields
   */
  async getAllResubmissionRequests(applicationId: number) {
    const application = await this.applicationRepo.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException(
        `Application with ID ${applicationId} not found`
      );
    }

    const allRequests = application.resubmissionRequests || [];

    // Get admin fields map for quick lookup
    const adminFieldsMap = new Map();
    if (application.adminRequestedFields && Array.isArray(application.adminRequestedFields)) {
      application.adminRequestedFields.forEach((field: any) => {
        adminFieldsMap.set(field.id, field);
      });
    }

    // Enrich requests with field definitions
    const enrichedRequests = allRequests.map((req) => {
      const newFields = req.fieldIds
        .filter((fieldId: number) => fieldId < 0) // Only negative IDs are admin fields
        .map((fieldId: number) => {
          const fieldDef = adminFieldsMap.get(fieldId);
          if (fieldDef) {
            return {
              id: fieldDef.id,
              question: fieldDef.question,
              fieldType: fieldDef.fieldType,
              placeholder: fieldDef.placeholder,
              isRequired: fieldDef.isRequired,
              options: fieldDef.options,
              allowedFileTypes: fieldDef.allowedFileTypes,
              maxFileSizeMB: fieldDef.maxFileSizeMB,
              minLength: fieldDef.minLength,
              maxLength: fieldDef.maxLength,
            };
          }
          return null;
        })
        .filter(f => f !== null); // Remove null entries

      return {
        ...req,
        newFields: newFields.length > 0 ? newFields : undefined, // Only include if there are new fields
      };
    });

    return {
      status: true,
      message: 'Resubmission requests retrieved successfully',
      data: enrichedRequests,
    };
  }

  /**
   * Mark a resubmission request as fulfilled
   */
  async markRequestFulfilled(applicationId: number, requestId: string) {
    const application = await this.applicationRepo.findOne({
      where: { id: applicationId },
    });

    if (!application || !application.resubmissionRequests) {
      throw new NotFoundException('Resubmission request not found');
    }

    const request = application.resubmissionRequests.find(
      (req) => req.id === requestId
    );

    if (!request) {
      throw new NotFoundException('Resubmission request not found');
    }

    request.fulfilledAt = new Date().toISOString();

    // Check if all requests are fulfilled
    const allFulfilled = application.resubmissionRequests.every(
      (req) => req.fulfilledAt
    );

    if (allFulfilled) {
      application.status = 'processing';
      application.resubmissionRequests = null;
      // Clear backward compatibility fields
      application.resubmissionTarget = null;
      application.resubmissionTravelerId = null;
      application.requestedFieldIds = null;
    }

    await this.applicationRepo.save(application);

    return {
      status: true,
      message: allFulfilled
        ? 'All resubmissions fulfilled, status changed to processing'
        : 'Request marked as fulfilled',
      data: {
        allFulfilled,
        remainingRequests: application.resubmissionRequests?.filter(
          (req) => !req.fulfilledAt
        ).length || 0,
      },
    };
  }

  /**
   * Add admin-only custom fields to an application
   */
  async addAdminFields(
    id: number,
    dto: { travelerId?: number; fields: Array<any> },
  ) {
    try {
      const application = await this.applicationRepo.findOne({ where: { id } });
      if (!application) {
        throw new NotFoundException(`Visa application with ID ${id} not found`);
      }

      // Initialize storage
      if (!application.adminRequestedFields) {
        application.adminRequestedFields = [];
      }
      if (
        application.adminRequestedFieldMinId === undefined ||
        application.adminRequestedFieldMinId === null ||
        application.adminRequestedFieldMinId >= 0
      ) {
        application.adminRequestedFieldMinId = 0;
      }

      const added: any[] = [];
      for (const cf of dto.fields || []) {
        application.adminRequestedFieldMinId =
          (application.adminRequestedFieldMinId || 0) - 1;
        const adminField = {
          id: application.adminRequestedFieldMinId, // negative number
          fieldType: cf.fieldType,
          question: cf.question,
          placeholder: cf.placeholder,
          isRequired: cf.isRequired ?? false,
          options: cf.options,
          allowedFileTypes: cf.allowedFileTypes,
          maxFileSizeMB: cf.maxFileSizeMB,
          minLength: cf.minLength,
          maxLength: cf.maxLength,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          travelerId: cf.travelerId || dto.travelerId || undefined,
          source: 'admin',
        };
        application.adminRequestedFields.push(adminField);
        added.push(adminField);
      }

      await this.applicationRepo.save(application);
      return {
        status: true,
        message: 'Admin fields added successfully',
        count: added.length,
        data: added,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Error adding admin fields');
    }
  }

  /**
   * Remove an admin-only custom field from an application
   */
  async removeAdminField(id: number, fieldId: number) {
    try {
      const application = await this.applicationRepo.findOne({ where: { id } });
      if (!application) {
        throw new NotFoundException(`Visa application with ID ${id} not found`);
      }

      const before = application.adminRequestedFields || [];
      const after = before.filter((f: any) => f.id !== fieldId);
      if (after.length === before.length) {
        throw new NotFoundException(
          `Admin field with ID ${fieldId} not found for this application`,
        );
      }
      application.adminRequestedFields = after;
      await this.applicationRepo.save(application);
      return {
        status: true,
        message: 'Admin field removed successfully',
        data: { fieldId },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Error removing admin field');
    }
  }

  /**
   * Remove multiple admin-only custom fields from an application in a single request
   */
  async removeAdminFields(id: number, fieldIds: number[]) {
    try {
      const application = await this.applicationRepo.findOne({ where: { id } });
      if (!application) {
        throw new NotFoundException(`Visa application with ID ${id} not found`);
      }

      if (!fieldIds || fieldIds.length === 0) {
        throw new BadRequestException('No field IDs provided for deletion');
      }

      const before = application.adminRequestedFields || [];
      const fieldIdsSet = new Set(fieldIds);
      const after = before.filter((f: any) => !fieldIdsSet.has(f.id));

      const removedCount = before.length - after.length;
      if (removedCount === 0) {
        throw new NotFoundException(
          `None of the specified admin fields were found for this application`,
        );
      }

      application.adminRequestedFields = after;
      await this.applicationRepo.save(application);

      return {
        status: true,
        message: `${removedCount} admin field(s) removed successfully`,
        data: {
          removedFieldIds: fieldIds.filter(fid =>
            before.some((f: any) => f.id === fid)
          ),
          removedCount
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Error removing admin fields');
    }
  }
}
