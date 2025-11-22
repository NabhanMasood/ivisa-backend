import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmbassiesService } from './embassies.service';
import { EmbassiesController } from './embassies.controller';
import { Embassy } from './entities/embassy.entity';
import { VisaApplication } from '../visa-applications/entities/visa-application.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Embassy, VisaApplication])],
  controllers: [EmbassiesController],
  providers: [EmbassiesService],
})
export class EmbassiesModule {}

