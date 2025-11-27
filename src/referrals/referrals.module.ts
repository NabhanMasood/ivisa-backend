import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';
import { Referral } from './entities/referral.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CouponsModule } from '../coupons/coupons.module';
import { EmailModule } from '../email/email.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Referral, Customer]),
        CouponsModule, // Import to use CouponsService
        EmailModule, // Import to use EmailService
    ],
    controllers: [ReferralsController],
    providers: [ReferralsService],
    exports: [ReferralsService], // Export for use in auth module
})
export class ReferralsModule { }

