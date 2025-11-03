import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmbassiesService } from './embassies.service';
import { EmbassiesController } from './embassies.controller';
import { Embassy } from './entities/embassy.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Embassy])],
  controllers: [EmbassiesController],
  providers: [EmbassiesService],
})
export class EmbassiesModule {}

