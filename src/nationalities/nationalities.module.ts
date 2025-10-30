import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NationalitiesController } from './nationalities.controller';
import { NationalitiesService } from './nationalities.service';
import { Nationality } from './entities/nationality.entity';
import { Country } from '../countries/entities/country.entity';
import { VisaProduct } from '../visa-product/entities/visa-product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Nationality, Country, VisaProduct])],
  controllers: [NationalitiesController],
  providers: [NationalitiesService]
})
export class NationalitiesModule {}
