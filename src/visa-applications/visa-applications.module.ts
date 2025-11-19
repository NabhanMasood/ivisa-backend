import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisaApplicationsService } from './visa-applications.service';
import { VisaApplicationsController } from './visa-applications.controller';
import { VisaApplication } from './entities/visa-application.entity';
import { Customer } from '../customers/entities/customer.entity';
import { VisaProduct } from '../visa-product/entities/visa-product.entity';
import { Traveler } from '../travelers/entities/traveler.entity';
import { CouponsModule } from '../coupons/coupons.module';
import { CardInfoModule } from '../card-info/card-info.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VisaApplication, Customer, VisaProduct, Traveler]),
    CouponsModule, // Import to use CouponsService
    CardInfoModule, // Import to use CardInfoService
    EmailModule, // Import to use EmailService
  ],
  controllers: [VisaApplicationsController],
  providers: [VisaApplicationsService],
  exports: [VisaApplicationsService], // Export for use in other modules (travelers, payments)
})
export class VisaApplicationsModule { }
