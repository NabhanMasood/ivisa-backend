import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisaApplication } from './entities/visa-application.entity';
import { EmailService } from '../email/email.service';
import { SettingsService } from '../settings/settings.service';
import { CouponsService } from '../coupons/coupons.service';
import { ConfigService } from '@nestjs/config';
import { Coupon } from '../coupons/entities/coupon.entity';

@Injectable()
export class VisaApplicationsScheduler {
  private readonly logger = new Logger(VisaApplicationsScheduler.name);

  constructor(
    @InjectRepository(VisaApplication)
    private readonly applicationRepo: Repository<VisaApplication>,
    private readonly emailService: EmailService,
    private readonly settingsService: SettingsService,
    private readonly couponsService: CouponsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Run every hour to check for pending applications that need reminder emails
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handlePendingApplicationReminders() {
    this.logger.log('Running pending application reminder check...');

    try {
      // Initialize settings if needed
      await this.settingsService.initializeDefaultSettings();

      // Get settings
      const pendingReminderHours = await this.settingsService.getSettingAsNumber(
        'pending_reminder_hours',
        24,
      );
      const couponEmailHours = await this.settingsService.getSettingAsNumber(
        'coupon_email_hours',
        72,
      );
      const couponIdStr = await this.settingsService.getSetting('pending_reminder_coupon_id');
      const couponId = couponIdStr ? parseInt(couponIdStr, 10) : null;

      // Calculate cutoff times
      const now = new Date();
      const pendingReminderCutoff = new Date(now.getTime() - pendingReminderHours * 60 * 60 * 1000);
      const couponEmailCutoff = new Date(now.getTime() - (pendingReminderHours + couponEmailHours) * 60 * 60 * 1000);

      // Get frontend URL for application links
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

      // Find applications that need pending reminder (first email)
      // Conditions:
      // - status is 'draft'
      // - emailCaptured is not null
      // - emailCapturedAt is before cutoff
      // - pendingReminderSentAt is null (not sent yet)
      // - submittedAt is null (not submitted)
      const applicationsNeedingReminder = await this.applicationRepo
        .createQueryBuilder('app')
        .leftJoinAndSelect('app.customer', 'customer')
        .leftJoinAndSelect('app.visaProduct', 'visaProduct')
        .where('app.status = :status', { status: 'draft' })
        .andWhere('app.emailCaptured IS NOT NULL')
        .andWhere('app.emailCapturedAt < :cutoff', { cutoff: pendingReminderCutoff })
        .andWhere('app.pendingReminderSentAt IS NULL')
        .andWhere('app.submittedAt IS NULL')
        .getMany();

      this.logger.log(`Found ${applicationsNeedingReminder.length} applications needing pending reminder`);

      // Get coupon details if coupon is configured
      let coupon: Coupon | null = null;
      if (couponId) {
        try {
          coupon = await this.couponsService.findOne(couponId);
        } catch (error) {
          this.logger.warn(`Coupon with ID ${couponId} not found, sending emails without coupon`);
          coupon = null;
        }
      }

      // Send pending reminder emails
      for (const application of applicationsNeedingReminder) {
        try {
          const email = application.emailCaptured || application.customer?.email;
          const customerName = application.customer?.fullname || 'Valued Customer';
          
          if (!email) {
            this.logger.warn(`Skipping application ${application.id} - no email found`);
            continue;
          }

          // Use main website URL instead of specific application page
          const applicationUrl = frontendUrl;

          // Prepare coupon info
          let couponCode: string | undefined;
          let couponDiscount: string | undefined;

          if (coupon && coupon.status === 'enable') {
            couponCode = coupon.code;
            if (coupon.type === 'percent') {
              couponDiscount = `${coupon.value}% off`;
            } else if (coupon.type === 'amount') {
              couponDiscount = `$${coupon.value} off`;
            }
          }

          // Send email
          await this.emailService.sendPendingApplicationReminderEmail(
            email,
            customerName,
            applicationUrl,
            couponCode,
            couponDiscount,
          );

          // Update application to mark reminder as sent
          application.pendingReminderSentAt = new Date();
          await this.applicationRepo.save(application);

          this.logger.log(`Sent pending reminder to ${email} for application ${application.applicationNumber}`);
        } catch (error) {
          this.logger.error(`Failed to send pending reminder for application ${application.id}:`, error);
        }
      }

      // Find applications that need coupon email (second email)
      // Conditions:
      // - status is 'draft'
      // - emailCaptured is not null
      // - emailCapturedAt is before coupon cutoff
      // - pendingReminderSentAt is not null (first reminder was sent)
      // - couponEmailSentAt is null (coupon email not sent yet)
      // - submittedAt is null (not submitted)
      const applicationsNeedingCoupon = await this.applicationRepo
        .createQueryBuilder('app')
        .leftJoinAndSelect('app.customer', 'customer')
        .leftJoinAndSelect('app.visaProduct', 'visaProduct')
        .where('app.status = :status', { status: 'draft' })
        .andWhere('app.emailCaptured IS NOT NULL')
        .andWhere('app.emailCapturedAt < :cutoff', { cutoff: couponEmailCutoff })
        .andWhere('app.pendingReminderSentAt IS NOT NULL')
        .andWhere('app.couponEmailSentAt IS NULL')
        .andWhere('app.submittedAt IS NULL')
        .getMany();

      this.logger.log(`Found ${applicationsNeedingCoupon.length} applications needing coupon email`);

      // Must have a coupon configured to send coupon emails
      if (!coupon || coupon.status !== 'enable') {
        this.logger.warn('No valid coupon configured, skipping coupon emails');
      } else {
        const couponCode = coupon.code;
        let couponDiscount = '';
        if (coupon.type === 'percent') {
          couponDiscount = `${coupon.value}% off your application`;
        } else if (coupon.type === 'amount') {
          couponDiscount = `$${coupon.value} off your application`;
        }

        // Send coupon emails
        for (const application of applicationsNeedingCoupon) {
          try {
            const email = application.emailCaptured || application.customer?.email;
            const customerName = application.customer?.fullname || 'Valued Customer';
            
            if (!email) {
              this.logger.warn(`Skipping application ${application.id} - no email found`);
              continue;
            }

            // Use main website URL instead of specific application page
            const applicationUrl = frontendUrl;

            // Send email
            await this.emailService.sendAbandonedApplicationCouponEmail(
              email,
              customerName,
              applicationUrl,
              couponCode,
              couponDiscount,
            );

            // Update application to mark coupon email as sent
            application.couponEmailSentAt = new Date();
            await this.applicationRepo.save(application);

            this.logger.log(`Sent coupon email to ${email} for application ${application.applicationNumber}`);
          } catch (error) {
            this.logger.error(`Failed to send coupon email for application ${application.id}:`, error);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error in handlePendingApplicationReminders:', error);
    }
  }
}

