import { Controller, Post, Body, Get, Param, BadRequestException } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

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
}
