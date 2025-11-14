import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TravelersService } from './travelers.service';
import { TravelersController } from './travelers.controller';
import { Traveler } from './entities/traveler.entity';
import { VisaApplication } from '../visa-applications/entities/visa-application.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Traveler, VisaApplication])],
  controllers: [TravelersController],
  providers: [TravelersService],
  exports: [TravelersService], // Export for use in other modules
})
export class TravelersModule {}