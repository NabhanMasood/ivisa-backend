import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { VisaApplication } from '../visa-applications/entities/visa-application.entity';
import { Payment } from '../payments/entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([VisaApplication, Payment]),
  ],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService], // Export StripeService so it can be used in other modules
})
export class StripeModule {}