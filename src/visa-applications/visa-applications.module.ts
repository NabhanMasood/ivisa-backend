import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisaApplicationsService } from './visa-applications.service';
import { VisaApplicationsController } from './visa-applications.controller';
import { VisaApplicationsScheduler } from './visa-applications.scheduler';
import { VisaApplication } from './entities/visa-application.entity';
import { Customer } from '../customers/entities/customer.entity';
import { VisaProduct } from '../visa-product/entities/visa-product.entity';
import { VisaProductField } from '../visa-product/entities/visa-product-field.entity';
import { VisaApplicationFieldResponse } from '../visa-product/entities/visa-application-field-response.entity';
import { Traveler } from '../travelers/entities/traveler.entity';
import { Embassy } from '../embassies/entities/embassy.entity';
import { CouponsModule } from '../coupons/coupons.module';
import { CardInfoModule } from '../card-info/card-info.module';
import { EmailModule } from '../email/email.module';
import { SettingsModule } from '../settings/settings.module';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VisaApplication, Customer, VisaProduct, VisaProductField, VisaApplicationFieldResponse, Traveler, Embassy]),
    CouponsModule, // Import to use CouponsService
    CardInfoModule, // Import to use CardInfoService
    EmailModule, // Import to use EmailService
    SettingsModule, // Import to use SettingsService
    StripeModule, // Import to use StripeService for payment links
  ],
  controllers: [VisaApplicationsController],
  providers: [VisaApplicationsService, VisaApplicationsScheduler],
  exports: [VisaApplicationsService], // Export for use in other modules (travelers, payments)
})
export class VisaApplicationsModule { }
