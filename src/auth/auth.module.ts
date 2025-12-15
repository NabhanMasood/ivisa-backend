import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { Admin } from './entities/admin.entity';
import { Customer } from '../customers/entities/customer.entity';
import { EmailModule } from '../email/email.module';
import { ReferralsModule } from '../referrals/referrals.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, Customer]),
    EmailModule, // Import to use EmailService
    ReferralsModule, // Import to use ReferralsService
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule { }
