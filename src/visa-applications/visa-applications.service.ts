import {
    Injectable,
    NotFoundException,
    BadRequestException,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { VisaApplication } from './entities/visa-application.entity';
  import { Customer } from '../customers/entities/customer.entity';
  import { VisaProduct } from '../visa-product/entities/visa-product.entity';
  import { Traveler } from '../travelers/entities/traveler.entity';
  import { Payment } from '../payments/entities/payment.entity';
  import { CreateVisaApplicationDto } from './dto/create-visa-application.dto';
  import { UpdateVisaApplicationDto } from './dto/update-visa-application.dto';
  import { SelectProcessingDto } from './dto/select-processing.dto';
  import { SubmitApplicationDto } from './dto/submit-application.dto';
  import { SubmitCompleteApplicationDto } from './dto/submit-complete-application.dto';
  
  @Injectable()
  export class VisaApplicationsService {
    constructor(
      @InjectRepository(VisaApplication)
      private applicationRepo: Repository<VisaApplication>,
      @InjectRepository(Customer)
      private customerRepo: Repository<Customer>,
      @InjectRepository(VisaProduct)
      private visaProductRepo: Repository<VisaProduct>,
    ) {}
  
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
  
        // Generate application number
        const applicationNumber = await this.generateApplicationNumber();
  
        // Calculate fees
        const governmentFee =
          createDto.governmentFee ||
          visaProduct.govtFee * createDto.numberOfTravelers;
        const serviceFee =
          createDto.serviceFee ||
          visaProduct.serviceFee * createDto.numberOfTravelers;
        const totalAmount = governmentFee + serviceFee;
  
        // Create application
        const application = this.applicationRepo.create({
          ...createDto,
          applicationNumber,
          governmentFee,
          serviceFee,
          totalAmount,
          processingFee: 0,
          status: 'draft',
        });
  
        const result = await this.applicationRepo.save(application);
  
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
          customerName: app.customer?.fullname || '',
          destinationCountry: app.destinationCountry,
          visaType: app.visaType,
          numberOfTravelers: app.numberOfTravelers,
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
     * Get a single visa application by ID
     */
    async findOne(id: number) {
      try {
        const application = await this.applicationRepo.findOne({
          where: { id },
          relations: ['customer', 'visaProduct', 'travelers', 'payment'],
        });
  
        if (!application) {
          throw new NotFoundException(
            `Visa application with ID ${id} not found`,
          );
        }
  
        return {
          status: true,
          message: 'Visa application retrieved successfully',
          data: {
            id: application.id,
            applicationNumber: application.applicationNumber,
            customerId: application.customerId,
            customerName: application.customer?.fullname || '',
            customerEmail: application.customer?.email || '',
            visaProductId: application.visaProductId,
            visaProductName: application.visaProduct?.productName || '',
            nationality: application.nationality,
            destinationCountry: application.destinationCountry,
            visaType: application.visaType,
            numberOfTravelers: application.numberOfTravelers,
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
            travelers: application.travelers || [],
            payment: application.payment || null,
            createdAt: application.createdAt,
            updatedAt: application.updatedAt,
          },
        };
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
  
        // Update application
        Object.assign(application, updateDto);
  
        // Recalculate fees if numberOfTravelers changed
        if (updateDto.numberOfTravelers) {
          application.governmentFee =
            application.visaProduct.govtFee * updateDto.numberOfTravelers;
          application.serviceFee =
            application.visaProduct.serviceFee * updateDto.numberOfTravelers;
          application.totalAmount =
            application.governmentFee +
            application.serviceFee +
            application.processingFee;
        }
  
        const result = await this.applicationRepo.save(application);
  
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
        application.status = 'submitted';
        application.submittedAt = new Date();
        if (submitDto.notes) {
          application.notes = submitDto.notes;
        }
  
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
  
        // Only allow deletion of draft applications
        if (application.status !== 'draft') {
          throw new BadRequestException(
            'Can only delete applications in draft status',
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
        ] = await Promise.all([
          this.applicationRepo.count(),
          this.applicationRepo.count({ where: { status: 'draft' } }),
          this.applicationRepo.count({ where: { status: 'submitted' } }),
          this.applicationRepo.count({ where: { status: 'processing' } }),
          this.applicationRepo.count({ where: { status: 'approved' } }),
          this.applicationRepo.count({ where: { status: 'rejected' } }),
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
      
          return {
            status: true,
            message: 'Customer applications retrieved successfully',
            count: applications.length,
            data: applications
          };
        } catch (error) {
          throw new Error(`Failed to fetch customer applications: ${error.message}`);
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
        let customerId = submitDto.customerId;
        let customerWasCreated = false;
  
        // 1. If no customerId provided, create customer from first traveler
        if (!customerId && submitDto.travelers.length > 0) {
          const firstTraveler = submitDto.travelers[0];
          
          // Check if customer with this email already exists
          const existingCustomer = await this.customerRepo.findOne({
            where: { email: firstTraveler.email },
          });
  
          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else {
            // Create new customer from first traveler
            const newCustomer = this.customerRepo.create({
              fullname: `${firstTraveler.firstName} ${firstTraveler.lastName}`,
              email: firstTraveler.email,
              residenceCountry: firstTraveler.residenceCountry,
              status: 'Active',
            });
  
            const savedCustomer = await queryRunner.manager.save(newCustomer);
            customerId = savedCustomer.id;
            customerWasCreated = true;
          }
        }
  
        if (!customerId) {
          throw new BadRequestException(
            'Customer ID is required or at least one traveler must be provided',
          );
        }
  
        // 2. Only validate customer exists if it was provided (not auto-created)
        if (!customerWasCreated) {
          const customer = await this.customerRepo.findOne({
            where: { id: customerId },
          });
          if (!customer) {
            throw new NotFoundException(
              `Customer with ID ${customerId} not found`,
            );
          }
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
  
        // 4. Validate number of travelers matches
        if (submitDto.travelers.length !== submitDto.numberOfTravelers) {
          throw new BadRequestException(
            `Number of travelers (${submitDto.travelers.length}) does not match numberOfTravelers (${submitDto.numberOfTravelers})`,
          );
        }
  
        // 5. Generate application number
        const applicationNumber = await this.generateApplicationNumber();
  
        // 6. Calculate fees
        const governmentFee = visaProduct.govtFee * submitDto.numberOfTravelers;
        const serviceFee = visaProduct.serviceFee * submitDto.numberOfTravelers;
        const totalAmount = governmentFee + serviceFee + submitDto.processingFee;
  
        // 7. Create application
        const application = this.applicationRepo.create({
          applicationNumber,
          customerId: customerId,
          visaProductId: submitDto.visaProductId,
          nationality: submitDto.nationality,
          destinationCountry: submitDto.destinationCountry,
          visaType: submitDto.visaType,
          numberOfTravelers: submitDto.numberOfTravelers,
          processingType: submitDto.processingType,
          processingFee: submitDto.processingFee,
          governmentFee,
          serviceFee,
          totalAmount,
          status: 'submitted', // Directly submitted
          submittedAt: new Date(),
          notes: submitDto.notes,
        });
  
        const savedApplication = await queryRunner.manager.save(VisaApplication, application);
  
        // 8. Create travelers with passport data
        const travelers = submitDto.travelers.map((travelerData) => {
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
            placeOfBirth: travelerData.placeOfBirth,
          };
        });
  
        const savedTravelers = await queryRunner.manager.save(Traveler, travelers);
  
        // 9. Create payment record
        const payment = {
          applicationId: savedApplication.id,
          amount: totalAmount,
          currency: 'PKR',
          paymentMethod: 'card',
          paymentGateway: submitDto.payment.paymentGateway || 'stripe',
          status: 'completed',
          transactionId: submitDto.payment.transactionId,
          paymentIntentId: submitDto.payment.paymentIntentId,
          cardholderName: submitDto.payment.cardholderName,
          cardLast4: submitDto.payment.cardLast4,
          cardBrand: submitDto.payment.cardBrand,
          paidAt: new Date(),
        };
  
        const savedPayment = await queryRunner.manager.save(Payment, payment);
  
        // 10. Commit transaction
        await queryRunner.commitTransaction();
  
        return {
          status: true,
          message: 'Application submitted successfully',
          data: {
            customerId: customerId, // Return customerId for frontend
            application: {
              id: savedApplication.id,
              applicationNumber: savedApplication.applicationNumber,
              status: savedApplication.status,
              totalAmount: parseFloat(savedApplication.totalAmount.toString()),
              submittedAt: savedApplication.submittedAt,
            },
            travelers: savedTravelers.map((t) => ({
              id: t.id,
              firstName: t.firstName,
              lastName: t.lastName,
              passportNumber: t.passportNumber,
            })),
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
  }