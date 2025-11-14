import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisaApplicationsService } from './visa-applications.service';
import { VisaApplicationsController } from './visa-applications.controller';
import { VisaApplication } from './entities/visa-application.entity';
import { Customer } from '../customers/entities/customer.entity';
import { VisaProduct } from '../visa-product/entities/visa-product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([VisaApplication, Customer, VisaProduct]),
  ],
  controllers: [VisaApplicationsController],
  providers: [VisaApplicationsService],
  exports: [VisaApplicationsService], // Export for use in other modules (travelers, payments)
})
export class VisaApplicationsModule {}