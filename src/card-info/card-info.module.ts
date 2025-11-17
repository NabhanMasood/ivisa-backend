import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardInfoService } from './card-info.service';
import { CardInfoController } from './card-info.controller';
import { CardInfo } from './entities/card-info.entity';
import { Customer } from '../customers/entities/customer.entity';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CardInfo, Customer]),
    StripeModule, // Import StripeModule to use StripeService
  ],
  controllers: [CardInfoController],
  providers: [CardInfoService],
  exports: [CardInfoService], // Export service so it can be used in other modules
})
export class CardInfoModule {}

