import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { Admin } from './entities/admin.entity';
import { Customer } from '../customers/entities/customer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, Customer])
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule { }
