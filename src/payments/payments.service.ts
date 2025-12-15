import {
    Injectable,
    NotFoundException,
    BadRequestException,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { Payment } from './entities/payment.entity';
  import { VisaApplication } from '../visa-applications/entities/visa-application.entity';
  import { CreatePaymentDto } from './dto/create-payment.dto';
  import { PaymentIntentDto } from './dto/payment-intent.dto';
  import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
  
  @Injectable()
  export class PaymentsService {
    constructor(
      @InjectRepository(Payment)
      private paymentRepo: Repository<Payment>,
      @InjectRepository(VisaApplication)
      private applicationRepo: Repository<VisaApplication>,
    ) {}
  
    /**
     * Create a payment intent (Step 5 - Before actual payment)
     * This initializes a payment record in 'pending' status
     */
    async createPaymentIntent(intentDto: PaymentIntentDto) {
      try {
        // Validate application exists
        const application = await this.applicationRepo.findOne({
          where: { id: intentDto.applicationId },
          relations: ['payment'],
        });
  
        if (!application) {
          throw new NotFoundException(
            `Visa application with ID ${intentDto.applicationId} not found`,
          );
        }
  
        // Check if payment already exists
        if (application.payment) {
          // If payment exists and is completed, don't allow new intent
          if (application.payment.status === 'completed') {
            throw new BadRequestException(
              'Payment already completed for this application',
            );
          }
          // If payment exists but not completed, return existing payment
          return {
            status: true,
            message: 'Existing payment intent retrieved',
            data: {
              paymentId: application.payment.id,
              paymentIntentId: application.payment.paymentIntentId,
              clientSecret: application.payment.clientSecret,
              amount: parseFloat(application.payment.amount.toString()),
              currency: application.payment.currency,
              status: application.payment.status,
              applicationId: application.id,
            },
          };
        }
  
        // Generate a mock payment intent ID (replace with actual Stripe integration)
        const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const clientSecret = `${paymentIntentId}_secret_${Math.random().toString(36).substring(7)}`;
  
        // Create payment record
        const payment = this.paymentRepo.create({
          applicationId: intentDto.applicationId,
          customerId: application.customerId, // Link to customer
          amount: intentDto.amount || application.totalAmount,
          currency: intentDto.currency || 'USD',
          paymentMethod: intentDto.paymentMethod || 'card',
          paymentGateway: 'stripe', // Default gateway
          status: 'pending',
          paymentIntentId,
          clientSecret,
          metadata: intentDto.metadata,
        });
  
        const result = await this.paymentRepo.save(payment);
  
        return {
          status: true,
          message: 'Payment intent created successfully',
          data: {
            paymentId: result.id,
            paymentIntentId: result.paymentIntentId,
            clientSecret: result.clientSecret,
            amount: parseFloat(result.amount.toString()),
            currency: result.currency,
            status: result.status,
            applicationId: result.applicationId,
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
          error.message || 'Error creating payment intent',
        );
      }
    }
  
    /**
     * Confirm payment (Step 5 - After successful payment on frontend)
     * This is called after the frontend confirms payment with Stripe/payment gateway
     */
    async confirmPayment(confirmDto: ConfirmPaymentDto) {
      try {
        // Get application with payment
        const application = await this.applicationRepo.findOne({
          where: { id: confirmDto.applicationId },
          relations: ['payment', 'travelers'],
        });
  
        if (!application) {
          throw new NotFoundException(
            `Visa application with ID ${confirmDto.applicationId} not found`,
          );
        }
  
        if (!application.payment) {
          throw new BadRequestException(
            'No payment intent found for this application. Please create a payment intent first.',
          );
        }
  
        const payment = application.payment;
  
        // Check if already completed
        if (payment.status === 'completed') {
          return {
            status: true,
            message: 'Payment already completed',
            data: payment,
          };
        }
  
        // Update payment status
        payment.status = 'completed';
        payment.paidAt = new Date();
        payment.cardholderName = confirmDto.cardholderName;
        
        if (confirmDto.cardLast4) {
          payment.cardLast4 = confirmDto.cardLast4;
        }
        
        if (confirmDto.cardBrand) {
          payment.cardBrand = confirmDto.cardBrand;
        }
        
        if (confirmDto.transactionId) {
          payment.transactionId = confirmDto.transactionId;
        } else if (payment.paymentIntentId) {
          payment.transactionId = payment.paymentIntentId;
        }
        
        if (confirmDto.paymentIntentId) {
          payment.paymentIntentId = confirmDto.paymentIntentId;
        }
        
        if (confirmDto.paymentGateway) {
          payment.paymentGateway = confirmDto.paymentGateway;
        }
        
        if (confirmDto.metadata) {
          payment.metadata = {
            ...payment.metadata,
            ...confirmDto.metadata,
          };
        }
  
        const result = await this.paymentRepo.save(payment);
  
        return {
          status: true,
          message: 'Payment confirmed successfully',
          data: {
            id: result.id,
            applicationId: result.applicationId,
            amount: parseFloat(result.amount.toString()),
            currency: result.currency,
            status: result.status,
            transactionId: result.transactionId,
            cardholderName: result.cardholderName,
            cardLast4: result.cardLast4,
            paidAt: result.paidAt,
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
          error.message || 'Error confirming payment',
        );
      }
    }
  
    /**
     * Create a payment record directly (alternative to payment intent flow)
     */
    async create(createDto: CreatePaymentDto) {
      try {
        // Validate application exists
        const application = await this.applicationRepo.findOne({
          where: { id: createDto.applicationId },
          relations: ['payment'],
        });
  
        if (!application) {
          throw new NotFoundException(
            `Visa application with ID ${createDto.applicationId} not found`,
          );
        }
  
        // Check if payment already exists
        if (application.payment) {
          throw new BadRequestException(
            'Payment already exists for this application',
          );
        }
  
        // Create payment
        const payment = this.paymentRepo.create({
          applicationId: createDto.applicationId,
          customerId: application.customerId, // Link to customer
          amount: createDto.amount,
          currency: createDto.currency || 'USD',
          paymentMethod: createDto.paymentMethod,
          paymentGateway: createDto.paymentGateway || 'manual',
          status: 'pending',
          notes: createDto.notes,
        });
  
        const result = await this.paymentRepo.save(payment);
  
        return {
          status: true,
          message: 'Payment created successfully',
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
          error.message || 'Error creating payment',
        );
      }
    }
  
    /**
     * Get payment by application ID
     */
    async findByApplication(applicationId: number) {
      try {
        const application = await this.applicationRepo.findOne({
          where: { id: applicationId },
        });
  
        if (!application) {
          throw new NotFoundException(
            `Visa application with ID ${applicationId} not found`,
          );
        }
  
        const payment = await this.paymentRepo.findOne({
          where: { applicationId },
          relations: ['application', 'customer'],
        });
  
        if (!payment) {
          throw new NotFoundException(
            `No payment found for application ID ${applicationId}`,
          );
        }
  
        return {
          status: true,
          message: 'Payment retrieved successfully',
          data: {
            id: payment.id,
            applicationId: payment.applicationId,
            applicationNumber: payment.application?.applicationNumber,
            customerId: payment.customerId,
            customer: payment.customer ? {
              id: payment.customer.id,
              fullname: payment.customer.fullname,
              email: payment.customer.email,
              phoneNumber: payment.customer.phoneNumber,
            } : null,
            amount: parseFloat(payment.amount.toString()),
            currency: payment.currency,
            paymentMethod: payment.paymentMethod,
            paymentGateway: payment.paymentGateway,
            status: payment.status,
            transactionId: payment.transactionId,
            cardholderName: payment.cardholderName,
            cardLast4: payment.cardLast4,
            cardBrand: payment.cardBrand,
            paidAt: payment.paidAt,
            createdAt: payment.createdAt,
          },
        };
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw error;
        }
        throw new BadRequestException(
          error.message || 'Error fetching payment',
        );
      }
    }
  
    /**
     * Get payment by ID
     */
    async findOne(id: number) {
      try {
        const payment = await this.paymentRepo.findOne({
          where: { id },
          relations: ['application', 'customer'],
        });
  
        if (!payment) {
          throw new NotFoundException(`Payment with ID ${id} not found`);
        }
  
        return {
          status: true,
          message: 'Payment retrieved successfully',
          data: {
            ...payment,
            customer: payment.customer ? {
              id: payment.customer.id,
              fullname: payment.customer.fullname,
              email: payment.customer.email,
              phoneNumber: payment.customer.phoneNumber,
            } : null,
          },
        };
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw error;
        }
        throw new BadRequestException(
          error.message || 'Error fetching payment',
        );
      }
    }
  
    /**
     * Mark payment as failed
     */
    async markAsFailed(applicationId: number, reason: string) {
      try {
        const payment = await this.paymentRepo.findOne({
          where: { applicationId },
        });
  
        if (!payment) {
          throw new NotFoundException(
            `No payment found for application ID ${applicationId}`,
          );
        }
  
        payment.status = 'failed';
        payment.failedAt = new Date();
        payment.failureReason = reason;
  
        const result = await this.paymentRepo.save(payment);
  
        return {
          status: true,
          message: 'Payment marked as failed',
          data: result,
        };
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw error;
        }
        throw new BadRequestException(
          error.message || 'Error marking payment as failed',
        );
      }
    }
  
    /**
     * Refund payment
     */
    async refundPayment(applicationId: number, reason: string) {
      try {
        const payment = await this.paymentRepo.findOne({
          where: { applicationId },
        });
  
        if (!payment) {
          throw new NotFoundException(
            `No payment found for application ID ${applicationId}`,
          );
        }
  
        if (payment.status !== 'completed') {
          throw new BadRequestException('Can only refund completed payments');
        }
  
        payment.status = 'refunded';
        payment.refundedAt = new Date();
        payment.refundReason = reason;
  
        const result = await this.paymentRepo.save(payment);
  
        return {
          status: true,
          message: 'Payment refunded successfully',
          data: result,
        };
      } catch (error) {
        if (
          error instanceof NotFoundException ||
          error instanceof BadRequestException
        ) {
          throw error;
        }
        throw new BadRequestException(error.message || 'Error refunding payment');
      }
    }
  
    /**
     * Get all payments
     */
    async findAll(status?: string) {
      try {
        const where: any = {};
        if (status) {
          where.status = status;
        }

        const payments = await this.paymentRepo.find({
          where,
          relations: ['application', 'customer'],
          order: { createdAt: 'DESC' },
        });

        return {
          status: true,
          message: 'Payments retrieved successfully',
          count: payments.length,
          data: payments.map((payment) => ({
            id: payment.id,
            applicationId: payment.applicationId,
            applicationNumber: payment.application?.applicationNumber,
            customerId: payment.customerId,
            customer: payment.customer ? {
              id: payment.customer.id,
              fullname: payment.customer.fullname,
              email: payment.customer.email,
              phoneNumber: payment.customer.phoneNumber,
            } : null,
            amount: parseFloat(payment.amount.toString()),
            currency: payment.currency,
            paymentMethod: payment.paymentMethod,
            paymentGateway: payment.paymentGateway,
            status: payment.status,
            transactionId: payment.transactionId,
            cardholderName: payment.cardholderName,
            cardLast4: payment.cardLast4,
            cardBrand: payment.cardBrand,
            paidAt: payment.paidAt,
            failedAt: payment.failedAt,
            failureReason: payment.failureReason,
            refundedAt: payment.refundedAt,
            refundReason: payment.refundReason,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
          })),
        };
      } catch (error) {
        throw new BadRequestException(
          error.message || 'Error fetching payments',
        );
      }
    }

    /**
     * Get payments by customer ID
     */
    async findByCustomer(customerId: number, status?: string) {
      try {
        const where: any = { customerId };
        if (status) {
          where.status = status;
        }

        const payments = await this.paymentRepo.find({
          where,
          relations: ['application', 'customer'],
          order: { createdAt: 'DESC' },
        });

        return {
          status: true,
          message: 'Customer payments retrieved successfully',
          count: payments.length,
          data: payments.map((payment) => ({
            id: payment.id,
            applicationId: payment.applicationId,
            applicationNumber: payment.application?.applicationNumber,
            customerId: payment.customerId,
            customer: payment.customer ? {
              id: payment.customer.id,
              fullname: payment.customer.fullname,
              email: payment.customer.email,
              phoneNumber: payment.customer.phoneNumber,
            } : null,
            amount: parseFloat(payment.amount.toString()),
            currency: payment.currency,
            paymentMethod: payment.paymentMethod,
            paymentGateway: payment.paymentGateway,
            status: payment.status,
            transactionId: payment.transactionId,
            cardholderName: payment.cardholderName,
            cardLast4: payment.cardLast4,
            cardBrand: payment.cardBrand,
            paidAt: payment.paidAt,
            failedAt: payment.failedAt,
            failureReason: payment.failureReason,
            refundedAt: payment.refundedAt,
            refundReason: payment.refundReason,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
          })),
        };
      } catch (error) {
        throw new BadRequestException(
          error.message || 'Error fetching customer payments',
        );
      }
    }

    /**
     * Get payment summary statistics
     */
    async getSummary() {
      try {
        const [
          totalPayments,
          completedPayments,
          pendingPayments,
          failedPayments,
        ] = await Promise.all([
          this.paymentRepo.count(),
          this.paymentRepo.count({ where: { status: 'completed' } }),
          this.paymentRepo.count({ where: { status: 'pending' } }),
          this.paymentRepo.count({ where: { status: 'failed' } }),
        ]);
  
        // Calculate total amounts
        const allPayments = await this.paymentRepo.find();
        const completedPaymentsData = await this.paymentRepo.find({
          where: { status: 'completed' },
        });
  
        const totalAmount = allPayments.reduce(
          (sum, p) => sum + parseFloat(p.amount.toString()),
          0,
        );
        const completedAmount = completedPaymentsData.reduce(
          (sum, p) => sum + parseFloat(p.amount.toString()),
          0,
        );
  
        return {
          status: true,
          message: 'Payment summary retrieved successfully',
          data: {
            totalPayments,
            completedPayments,
            pendingPayments,
            failedPayments,
            totalAmount: totalAmount.toFixed(2),
            completedAmount: completedAmount.toFixed(2),
          },
        };
      } catch (error) {
        throw new BadRequestException(
          error.message || 'Error fetching payment summary',
        );
      }
    }
  }