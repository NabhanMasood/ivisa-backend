import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisaProductService } from './visa-product.service';
import { VisaProductController } from './visa-product.controller';
import { VisaProduct } from './entities/visa-product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VisaProduct])],
  controllers: [VisaProductController],
  providers: [VisaProductService],
})
export class VisaProductModule {}
