  import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    ParseIntPipe,
    BadRequestException,
    Patch,
    Query,
  } from '@nestjs/common';
  import { PaymentsService } from './payments.service';
  import { CreatePaymentDto } from './dto/create-payment.dto';
  import { PaymentIntentDto } from './dto/payment-intent.dto';
  import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
  
  @Controller('payments')
  export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) {}
  
    /**
     * POST /payments/intent
     * Create a payment intent (Step 5 - Initialize payment)
     */
    @Post('intent')
    async createIntent(@Body() intentDto: PaymentIntentDto) {
      try {
        return await this.paymentsService.createPaymentIntent(intentDto);
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to create payment intent',
        });
      }
    }
  
    /**
     * POST /payments/confirm
     * Confirm payment (Step 5 - After successful payment)
     */
    @Post('confirm')
    async confirmPayment(@Body() confirmDto: ConfirmPaymentDto) {
      try {
        return await this.paymentsService.confirmPayment(confirmDto);
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to confirm payment',
        });
      }
    }
  
    /**
     * POST /payments
     * Create a payment record directly (alternative flow)
     */
    @Post()
    async create(@Body() createDto: CreatePaymentDto) {
      try {
        return await this.paymentsService.create(createDto);
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to create payment',
        });
      }
    }
    /**
     * GET /payments/summary
     * Get payment statistics
     */
    @Get('summary')
    async getSummary() {
      try {
        return await this.paymentsService.getSummary();
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to fetch payment summary',
        });
      }
    }
    /**
     * GET /payments/application/:applicationId
     * Get payment by application ID
     */
    @Get('application/:applicationId')
    async findByApplication(
      @Param('applicationId', ParseIntPipe) applicationId: number,
    ) {
      try {
        return await this.paymentsService.findByApplication(applicationId);
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to fetch payment',
        });
      }
    }

    /**
     * GET /payments/customer/:customerId
     * Get all payments for a specific customer (optionally filtered by status)
     */
    @Get('customer/:customerId')
    async findByCustomer(
      @Param('customerId', ParseIntPipe) customerId: number,
      @Query('status') status?: string,
    ) {
      try {
        return await this.paymentsService.findByCustomer(customerId, status);
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to fetch customer payments',
        });
      }
    }

    /**
     * GET /payments
     * Get all payments (optionally filtered by status)
     */
    @Get()
    async findAll(@Query('status') status?: string) {
      try {
        return await this.paymentsService.findAll(status);
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to fetch payments',
        });
      }
    }

    /**
     * GET /payments/:id
     * Get payment by ID
     */
    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
      try {
        return await this.paymentsService.findOne(id);
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to fetch payment',
        });
      }
    }
  
    /**
     * PATCH /payments/application/:applicationId/failed
     * Mark payment as failed
     */
    @Patch('application/:applicationId/failed')
    async markAsFailed(
      @Param('applicationId', ParseIntPipe) applicationId: number,
      @Body('reason') reason: string,
    ) {
      try {
        return await this.paymentsService.markAsFailed(applicationId, reason);
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to mark payment as failed',
        });
      }
    }
  
    /**
     * POST /payments/application/:applicationId/refund
     * Refund a completed payment
     */
    @Post('application/:applicationId/refund')
    async refundPayment(
      @Param('applicationId', ParseIntPipe) applicationId: number,
      @Body('reason') reason: string,
    ) {
      try {
        return await this.paymentsService.refundPayment(applicationId, reason);
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to refund payment',
        });
      }
    }
  }