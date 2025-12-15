import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { Customer } from './entities/customer.entity';
import { Order } from './entities/order.entity';
import { VisaApplication } from '../visa-applications/entities/visa-application.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Order, VisaApplication])],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}

