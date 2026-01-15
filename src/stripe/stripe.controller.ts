import { Controller, Post, Body, Get, Param, BadRequestException, Headers, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StripeService } from './stripe.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { VisaApplication } from '../visa-applications/entities/visa-application.entity';
import { Payment } from '../payments/entities/payment.entity';

@Controller('stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    @InjectRepository(VisaApplication)
    private applicationRepo: Repository<VisaApplication>,
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
  ) {}

  @Post('create-payment-intent')
  async createPaymentIntent(@Body() dto: CreatePaymentIntentDto) {
    // Access the amount from the DTO
    const paymentIntent = await this.stripeService.createPaymentIntent(dto.amount);
    return { clientSecret: paymentIntent.client_secret };
  }

  /**
   * GET /stripe/retrieve-payment-method/:paymentMethodId
   * Retrieve payment method details from Stripe
   */
  @Get('retrieve-payment-method/:paymentMethodId')
  async retrievePaymentMethod(@Param('paymentMethodId') paymentMethodId: string) {
    try {
      const paymentMethod = await this.stripeService.retrievePaymentMethod(paymentMethodId);
      return {
        status: true,
        message: 'Payment method retrieved successfully',
        data: paymentMethod,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to retrieve payment method',
      });
    }
  }

  /**
   * POST /stripe/webhook
   * Handle Stripe webhook events (checkout.session.completed)
   * This updates the application when a manual order payment is completed
   */
  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('Missing raw body for webhook verification');
    }

    let event;
    try {
      event = this.stripeService.constructWebhookEvent(req.rawBody, signature);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata || {};
      const applicationId = metadata.applicationId;
      const applicationNumber = metadata.applicationNumber;

      console.log(`Payment completed for application ${applicationNumber} (ID: ${applicationId})`);

      if (applicationId) {
        try {
          // Update the application with the checkout session ID and change status
          await this.applicationRepo.update(
            { id: parseInt(applicationId, 10) },
            {
              stripeCheckoutSessionId: session.id,
              status: 'pending', // Move from 'manual' to 'pending' after payment
            },
          );

          // Create a payment record
          const existingPayment = await this.paymentRepo.findOne({
            where: { applicationId: parseInt(applicationId, 10) },
          });

          if (!existingPayment) {
            // Retrieve payment method details if available
            const paymentIntent = session.payment_intent;

            await this.paymentRepo.save({
              applicationId: parseInt(applicationId, 10),
              amount: session.amount_total / 100, // Convert from cents
              currency: session.currency?.toUpperCase() || 'GBP',
              paymentMethod: 'card',
              paymentGateway: 'stripe',
              paymentIntentId: paymentIntent,
              status: 'completed',
              cardholderName: metadata.customerName || '',
            });
          } else {
            // Update existing payment record
            await this.paymentRepo.update(
              { id: existingPayment.id },
              {
                status: 'completed',
                paymentIntentId: session.payment_intent,
              },
            );
          }

          console.log(`Application ${applicationNumber} updated after payment`);
        } catch (dbError) {
          console.error('Error updating application after payment:', dbError);
        }
      }
    }

    return { received: true };
  }
}
