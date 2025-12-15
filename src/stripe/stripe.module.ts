import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';

@Module({
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService], // Export StripeService so it can be used in other modules
})
export class StripeModule {}