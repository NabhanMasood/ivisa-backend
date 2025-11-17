import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe | null = null;

  constructor(private configService: ConfigService) {}

  private getStripeInstance(): Stripe {
    if (!this.stripe) {
      // Try ConfigService first, then fallback to process.env
      const configValue = this.configService.get<string>('STRIPE_SECRET_KEY');
      const envValue = process.env.STRIPE_SECRET_KEY;
      const stripeSecretKey = (configValue || envValue)?.trim();
      
      if (!stripeSecretKey) {
        // Debug: Check what env vars are available
        const allEnvKeys = Object.keys(process.env).sort();
        const sampleKeys = allEnvKeys.slice(0, 10).join(', ');
        const stripeVars = allEnvKeys
          .filter(key => key.toUpperCase().includes('STRIPE'))
          .map(key => `${key}=${process.env[key]?.substring(0, 10)}...`);
        
        // Check if ConfigService is working by testing another known env var
        const testDbVar = this.configService.get<string>('PGHOST') || this.configService.get<string>('PGUSER');
        const configWorking = testDbVar ? 'ConfigService is working' : 'ConfigService may not be reading .env';
        
        throw new BadRequestException(
          `STRIPE_SECRET_KEY is not defined. ConfigService value: ${configValue ? 'found' : 'null'}, process.env value: ${envValue ? 'found' : 'null'}. ${configWorking}. Sample env vars: ${sampleKeys}${stripeVars.length > 0 ? `. Stripe vars found: ${stripeVars.join(', ')}` : ''}`
        );
      }

      // Initialize Stripe with the secret key
      // Using default API version (latest stable) - you can specify a version if needed
      this.stripe = new Stripe(stripeSecretKey);
    }

    return this.stripe;
  }

  // Create a payment intent
  async createPaymentIntent(amount: number, currency: string = 'usd') {
    const stripe = this.getStripeInstance();
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ['card'], 

    });

    return paymentIntent;
  }

  /**
   * Retrieve payment method details from Stripe
   * @param paymentMethodId - Stripe payment method ID (e.g., pm_xxx)
   * @returns Payment method object with card details
   */
  async retrievePaymentMethod(paymentMethodId: string) {
    try {
      const stripe = this.getStripeInstance();
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      
      if (!paymentMethod || paymentMethod.type !== 'card') {
        throw new BadRequestException('Payment method is not a card');
      }

      return {
        id: paymentMethod.id,
        card: {
          last4: paymentMethod.card?.last4,
          brand: paymentMethod.card?.brand,
          exp_month: paymentMethod.card?.exp_month,
          exp_year: paymentMethod.card?.exp_year,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to retrieve payment method from Stripe: ${error.message}`,
      );
    }
  }
}
