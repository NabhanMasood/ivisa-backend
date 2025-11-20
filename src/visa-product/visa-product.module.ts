import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisaProductService } from './visa-product.service';
import { VisaProductController } from './visa-product.controller';
import { VisaProduct } from './entities/visa-product.entity';
import { ProcessingFee } from './entities/processing-fee.entity';
import { VisaProductFieldsService } from './visa-product-fields.service';
import { VisaProductFieldsController } from './visa-product-fields.controller';
import { VisaApplication } from '../visa-applications/entities/visa-application.entity';
import { Traveler } from '../travelers/entities/traveler.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VisaProduct,
      ProcessingFee,
      VisaApplication,
      Traveler,
    ]),
    EmailModule,
  ],
  controllers: [VisaProductController, VisaProductFieldsController],
  providers: [VisaProductService, VisaProductFieldsService],
  exports: [VisaProductFieldsService],
})
export class VisaProductModule { }
