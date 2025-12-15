import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment } from './entities/payment.entity';
import { VisaApplication } from '../visa-applications/entities/visa-application.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, VisaApplication])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService], // Export for use in other modules
})
export class PaymentsModule {}