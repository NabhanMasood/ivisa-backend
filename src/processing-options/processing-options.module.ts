import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessingOptionsService } from './processing-options.service';
import { ProcessingOptionsController } from './processing-options.controller';
import { ProcessingOption } from './entities/processing-option.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProcessingOption])],
  controllers: [ProcessingOptionsController],
  providers: [ProcessingOptionsService],
  exports: [ProcessingOptionsService], // Export for use in other modules
})
export class ProcessingOptionsModule {}