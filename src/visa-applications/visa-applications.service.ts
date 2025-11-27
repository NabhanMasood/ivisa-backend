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

      // Validate embassy exists if embassyId is provided
      if (createDto.embassyId) {
        const embassy = await this.embassyRepo.findOne({
          where: { id: createDto.embassyId },
        });
        if (!embassy) {
          throw new NotFoundException(
            `Embassy with ID ${createDto.embassyId} not found`,
          );
        }
      }

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
      const { travelers, draftData, currentStep, ...applicationData } = createDto;

      // Create application
      const application = this.applicationRepo.create({
        ...applicationData,
        applicationNumber,
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
    // Reconstruct traveler 1 (the customer) from customer data
    // Traveler 1 is stored in customer table, not in travelers table
    const customerTraveler = application.customer ? {
      firstName: application.customer.fullname.split(' ')[0] || '',
      lastName: application.customer.fullname.split(' ').slice(1).join(' ') || '',
      email: application.customer.email,
      dateOfBirth: application.customer.dateOfBirth,
      passportNationality: application.customer.passportNationality,
      passportNumber: application.customer.passportNumber,
      passportExpiryDate: application.customer.passportExpiryDate,
      residenceCountry: application.customer.residenceCountry,
      nationality: application.customer.nationality,
      hasSchengenVisa: application.customer.hasSchengenVisa,
      receiveUpdates: application.customer.receiveUpdates ?? false,
    } : null;

    // ✅ Format travelers WITH their fieldResponses
    const formattedTravelers = (application.travelers || []).map(traveler => ({
      id: traveler.id,
      firstName: traveler.firstName,
      lastName: traveler.lastName,
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
      fieldResponses: traveler.fieldResponses || {},  // ✅ CRITICAL: Include fieldResponses
    }));

    // Combine customer (traveler 1) with additional travelers
    const allTravelers = customerTraveler
      ? [customerTraveler, ...formattedTravelers]
      : formattedTravelers;

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

        resubmissionRequests: application.resubmissionRequests || [],


        resubmissionTarget: application.resubmissionTarget || undefined,
        resubmissionTravelerId: application.resubmissionTravelerId || undefined,
        requestedFieldIds: application.requestedFieldIds || undefined,

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

      // Update application (exclude email, travelers, and draft data from updateDto to handle separately)
      Object.assign(application, restUpdateDto);

      // Recalculate fees if numberOfTravelers or processingFee changed
      if (updateDto.numberOfTravelers || updateDto.processingFee !== undefined) {
        application.governmentFee =
          application.visaProduct.govtFee * (updateDto.numberOfTravelers || application.numberOfTravelers);
        application.serviceFee =
          application.visaProduct.serviceFee * (updateDto.numberOfTravelers || application.numberOfTravelers);
        application.totalAmount =
          application.governmentFee +
          application.serviceFee +
          (updateDto.processingFee !== undefined ? updateDto.processingFee : application.processingFee);
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
        // Reconstruct traveler 1 (the customer) from customer data
        const customerTraveler = app.customer ? {
          firstName: app.customer.fullname.split(' ')[0] || '',
          lastName: app.customer.fullname.split(' ').slice(1).join(' ') || '',
          email: app.customer.email,
          dateOfBirth: app.customer.dateOfBirth,
          passportNationality: app.customer.passportNationality,
          passportNumber: app.customer.passportNumber,
          passportExpiryDate: app.customer.passportExpiryDate,
          residenceCountry: app.customer.residenceCountry,
          nationality: app.customer.nationality,
          hasSchengenVisa: app.customer.hasSchengenVisa,
          receiveUpdates: app.customer.receiveUpdates ?? false,
        } : null;

        // Format additional travelers (travelers 2+)
        const formattedTravelers = (app.travelers || []).map(traveler => ({
          id: traveler.id,
          firstName: traveler.firstName,
          lastName: traveler.lastName,
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
        }));

        // Combine customer (traveler 1) with additional travelers
        const allTravelers = customerTraveler
          ? [customerTraveler, ...formattedTravelers]
          : formattedTravelers;

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

          resubmissionRequests: app.resubmissionRequests || [],

          resubmissionTarget: app.resubmissionTarget || undefined,
          resubmissionTravelerId: app.resubmissionTravelerId || undefined,
          requestedFieldIds: app.requestedFieldIds || undefined,

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
          // Update existing customer with traveler 1's details
          customer.fullname = `${firstTraveler.firstName} ${firstTraveler.lastName}`;
          customer.email = firstTraveler.email;
          customer.residenceCountry = firstTraveler.residenceCountry;
          customer.nationality = submitDto.nationality || firstTraveler.passportNationality;
          customer.passportNumber = firstTraveler.passportNumber;
          customer.passportNationality = firstTraveler.passportNationality;
          customer.passportExpiryDate = new Date(firstTraveler.passportExpiryDate);
          customer.dateOfBirth = new Date(firstTraveler.dateOfBirth);
          customer.phoneNumber = submitDto.phoneNumber || firstTraveler.phone || customer.phoneNumber;
          customer.hasSchengenVisa = firstTraveler.hasSchengenVisa;
          customer.receiveUpdates = firstTraveler.receiveUpdates !== undefined ? firstTraveler.receiveUpdates : (customer.receiveUpdates ?? false);
          customer.status = customer.status || 'Active';
        } else {
          // Create new customer from traveler 1
          customer = this.customerRepo.create({
            fullname: `${firstTraveler.firstName} ${firstTraveler.lastName}`,
            email: firstTraveler.email,
            residenceCountry: firstTraveler.residenceCountry,
            nationality: submitDto.nationality || firstTraveler.passportNationality,
            passportNumber: firstTraveler.passportNumber,
            passportNationality: firstTraveler.passportNationality,
            passportExpiryDate: new Date(firstTraveler.passportExpiryDate),
            dateOfBirth: new Date(firstTraveler.dateOfBirth),
            phoneNumber: submitDto.phoneNumber || firstTraveler.phone || undefined,
            hasSchengenVisa: firstTraveler.hasSchengenVisa,
            receiveUpdates: firstTraveler.receiveUpdates !== undefined ? firstTraveler.receiveUpdates : false,
            status: 'Active',
          });
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
        // Update customer with traveler 1's details
        customer.fullname = `${firstTraveler.firstName} ${firstTraveler.lastName}`;
        customer.email = firstTraveler.email;
        customer.residenceCountry = firstTraveler.residenceCountry;
        customer.nationality = submitDto.nationality || firstTraveler.passportNationality;
        customer.passportNumber = firstTraveler.passportNumber;
        customer.passportNationality = firstTraveler.passportNationality;
        customer.passportExpiryDate = new Date(firstTraveler.passportExpiryDate);
        customer.dateOfBirth = new Date(firstTraveler.dateOfBirth);
        customer.phoneNumber = submitDto.phoneNumber || firstTraveler.phone || customer.phoneNumber;
        customer.hasSchengenVisa = firstTraveler.hasSchengenVisa;
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

      // Validate embassy exists if embassyId is provided
      if (submitDto.embassyId) {
        const embassy = await queryRunner.manager.findOne(Embassy, {
          where: { id: submitDto.embassyId },
        });
        if (!embassy) {
          throw new NotFoundException(
            `Embassy with ID ${submitDto.embassyId} not found`,
          );
        }
      }

      // Validate visaType - use draft's visaType if submitDto.visaType is empty
      let finalVisaType = submitDto.visaType;
      if ((!finalVisaType || finalVisaType.trim() === '') && draftApplication?.visaType) {
        finalVisaType = draftApplication.visaType;
      }

      // Final validation: visaType must be in the correct format
      if (!finalVisaType || finalVisaType.trim() === '') {
        throw new BadRequestException(
          'Visa type is required. Expected format: "{validity}-{entryType}" (e.g., "30-single", "90-multiple", "180-single")',
        );
      }

      if (!/^\d+-(single|multiple)$/.test(finalVisaType)) {
        throw new BadRequestException(
          `Invalid visa type: "${finalVisaType}". Expected format: "{validity}-{entryType}" (e.g., "30-single", "90-multiple", "180-single")`,
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
      const governmentFee = submitDto.govtFee;
      const serviceFee = submitDto.serviceFee;
      const baseTotalAmount = governmentFee + serviceFee + submitDto.processingFee;

      // 7. Use the totalAmount from payload (already includes discount if applied)
      // This is the amount the frontend calculated after applying coupon discount
      const totalAmount = submitDto.totalAmount;

      // Validate that the totalAmount is reasonable (not less than 0, not more than base)
      if (totalAmount < 0) {
        throw new BadRequestException('Total amount cannot be negative');
      }
      if (totalAmount > baseTotalAmount) {
        throw new BadRequestException('Total amount cannot exceed base amount');
      }

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
        draftApplication.processingFee = submitDto.processingFee;
        draftApplication.processingFeeId = submitDto.processingFeeId ?? null;
        draftApplication.governmentFee = governmentFee;
        draftApplication.serviceFee = serviceFee;
        draftApplication.totalAmount = totalAmount;
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
          processingFee: submitDto.processingFee,
          processingFeeId: submitDto.processingFeeId ?? null,
          governmentFee,
          serviceFee,
          totalAmount, // Use discounted amount from payload
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
        return {
          applicationId: savedApplication.id,
          firstName: travelerData.firstName,
          lastName: travelerData.lastName,
          email: travelerData.email,
          dateOfBirth: new Date(travelerData.dateOfBirth),
          passportNationality: travelerData.passportNationality,
          passportNumber: travelerData.passportNumber,
          passportExpiryDate: new Date(travelerData.passportExpiryDate),
          residenceCountry: travelerData.residenceCountry,
          hasSchengenVisa: travelerData.hasSchengenVisa,
          receiveUpdates: travelerData.receiveUpdates !== undefined ? travelerData.receiveUpdates : false,
          placeOfBirth: travelerData.placeOfBirth,
        };
      });

      // Only save if there are additional travelers (travelers 2+)
      const savedTravelers = additionalTravelers.length > 0
        ? await queryRunner.manager.save(Traveler, additionalTravelers)
        : [];

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

      const payment = {
        applicationId: savedApplication.id,
        customerId: savedApplication.customerId, // Link to customer
        amount: totalAmount, // Use discounted amount from payload
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

      const customerTraveler = {
        firstName: savedCustomer.fullname.split(' ')[0] || firstTraveler.firstName,
        lastName: savedCustomer.fullname.split(' ').slice(1).join(' ') || firstTraveler.lastName,
        email: savedCustomer.email,
        dateOfBirth: savedCustomer.dateOfBirth || firstTraveler.dateOfBirth,
        passportNationality: savedCustomer.passportNationality,
        passportNumber: savedCustomer.passportNumber,
        passportExpiryDate: savedCustomer.passportExpiryDate,
        residenceCountry: savedCustomer.residenceCountry,
        hasSchengenVisa: savedCustomer.hasSchengenVisa ?? firstTraveler.hasSchengenVisa, // Use customer's value if available, otherwise from original
        receiveUpdates: receiveUpdatesValue, // Always explicitly set as boolean
        placeOfBirth: firstTraveler.placeOfBirth, // Keep from original
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
            totalAmount: parseFloat(savedApplication.totalAmount.toString()),
            submittedAt: savedApplication.submittedAt,
          },
          // Traveler 1 (customer) + additional travelers
          travelers: [
            customerTraveler, // Traveler 1 (the customer)
            ...savedTravelers.map((t) => ({
              firstName: t.firstName,
              lastName: t.lastName,
              email: t.email,
              passportNumber: t.passportNumber,
              passportNationality: t.passportNationality,
              passportExpiryDate: t.passportExpiryDate,
              receiveUpdates: t.receiveUpdates ?? false,
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
      travelerId?: number;
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

      // Validate travelers exist
      for (const request of requests) {
        if (request.target === 'traveler' && request.travelerId) {
          const traveler = application.travelers?.find(
            (t) => t.id === request.travelerId
          );
          if (!traveler) {
            throw new NotFoundException(
              `Traveler with ID ${request.travelerId} not found for this application`
            );
          }
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
              travelerId: req.target === 'traveler' ? req.travelerId : undefined,
              source: 'admin',
            };
            application.adminRequestedFields.push(adminField);
            fieldIds.push(adminField.id); // Add the negative ID to the fieldIds array
          }
        }

        // Generate unique ID for this request
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const resubmissionRequest: ResubmissionRequest = {
          id: requestId,
          target: req.target,
          travelerId: req.travelerId || null,
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
        application.resubmissionTravelerId = requests[0].travelerId || null;
        application.requestedFieldIds = processedRequests[0].fieldIds;
      } else {
        // Multiple requests - clear old fields
        application.resubmissionTarget = null;
        application.resubmissionTravelerId = null;
        application.requestedFieldIds = null;
      }

      await this.applicationRepo.save(application);

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
}
