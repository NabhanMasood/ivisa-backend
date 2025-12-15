import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Referral, ReferralStatus } from './entities/referral.entity';
import { CreateReferralDto } from './dto/create-referral.dto';
import { Customer } from '../customers/entities/customer.entity';
import { Coupon } from '../coupons/entities/coupon.entity';
import { CouponsService } from '../coupons/coupons.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ReferralsService {
    constructor(
        @InjectRepository(Referral)
        private readonly referralRepo: Repository<Referral>,
        @InjectRepository(Customer)
        private readonly customerRepo: Repository<Customer>,
        private readonly couponsService: CouponsService,
        private readonly emailService: EmailService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Generate a unique coupon code for referral rewards
     */
    private generateCouponCode(): string {
        const prefix = 'REF';
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        const timestamp = Date.now().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}-${randomPart}-${timestamp}`;
    }

    /**
     * Calculate expiration date (90 days from now)
     */
    private getExpirationDate(): Date {
        const date = new Date();
        date.setDate(date.getDate() + 90);
        return date;
    }

    /**
     * Send a referral invitation
     */
    async sendReferral(referrerId: number, createDto: CreateReferralDto) {
        // Validate referrer exists
        const referrer = await this.customerRepo.findOne({
            where: { id: referrerId },
        });

        if (!referrer) {
            throw new NotFoundException('Referrer not found');
        }

        // Check if referral already exists for this email and referrer
        const existingReferral = await this.referralRepo.findOne({
            where: {
                referrerId,
                referredEmail: createDto.referredEmail.toLowerCase(),
            },
        });

        if (existingReferral) {
            throw new BadRequestException(
                'You have already sent a referral invitation to this email address',
            );
        }

        // Check if the referred email is the same as referrer's email
        if (
            referrer.email.toLowerCase() === createDto.referredEmail.toLowerCase()
        ) {
            throw new BadRequestException(
                'You cannot refer yourself',
            );
        }

        // Check if the referred email already has an account
        const existingCustomer = await this.customerRepo.findOne({
            where: { email: createDto.referredEmail.toLowerCase() },
        });

        if (existingCustomer && existingCustomer.password) {
            throw new BadRequestException(
                'This email address is already registered',
            );
        }

        // Create referral
        const referral = this.referralRepo.create({
            referrerId,
            referredEmail: createDto.referredEmail.toLowerCase(),
            status: 'pending',
            expiresAt: this.getExpirationDate(),
        });

        const savedReferral = await this.referralRepo.save(referral);

        // Send confirmation email to referrer (asynchronously)
        const frontendUrl = this.configService.get<string>('FRONTEND_URL');
        if (frontendUrl && referrer.email) {
            this.emailService.sendReferralConfirmationEmail(
                referrer.email,
                referrer.fullname,
                createDto.referredEmail,
            ).catch(error => {
                console.error('Failed to send referral confirmation email:', error);
            });
        }

        return {
            status: true,
            message: 'Referral invitation sent successfully',
            data: {
                id: savedReferral.id,
                referredEmail: savedReferral.referredEmail,
                status: savedReferral.status,
                expiresAt: savedReferral.expiresAt,
                createdAt: savedReferral.createdAt,
            },
        };
    }

    /**
     * Get all referrals for a specific referrer
     */
    async getMyReferrals(referrerId: number) {
        const referrals = await this.referralRepo.find({
            where: { referrerId },
            order: { createdAt: 'DESC' },
        });

        // Check for expired referrals and update status
        const now = new Date();
        for (const referral of referrals) {
            if (
                referral.status === 'pending' &&
                referral.expiresAt &&
                referral.expiresAt < now
            ) {
                referral.status = 'expired';
                await this.referralRepo.save(referral);
            }
        }

        // Fetch updated list
        const updatedReferrals = await this.referralRepo.find({
            where: { referrerId },
            order: { createdAt: 'DESC' },
        });

        return {
            status: true,
            message: 'Referrals retrieved successfully',
            data: updatedReferrals.map((ref) => ({
                id: ref.id,
                referredEmail: ref.referredEmail,
                status: ref.status,
                couponCode: ref.couponCode,
                signedUpAt: ref.signedUpAt,
                expiresAt: ref.expiresAt,
                createdAt: ref.createdAt,
                updatedAt: ref.updatedAt,
            })),
        };
    }

    /**
     * Get a single referral by ID
     */
    async getReferralById(referrerId: number, referralId: number) {
        const referral = await this.referralRepo.findOne({
            where: { id: referralId, referrerId },
        });

        if (!referral) {
            throw new NotFoundException('Referral not found');
        }

        // Check if expired
        if (
            referral.status === 'pending' &&
            referral.expiresAt &&
            referral.expiresAt < new Date()
        ) {
            referral.status = 'expired';
            await this.referralRepo.save(referral);
        }

        return {
            status: true,
            message: 'Referral retrieved successfully',
            data: {
                id: referral.id,
                referredEmail: referral.referredEmail,
                status: referral.status,
                couponCode: referral.couponCode,
                signedUpAt: referral.signedUpAt,
                expiresAt: referral.expiresAt,
                createdAt: referral.createdAt,
                updatedAt: referral.updatedAt,
            },
        };
    }

    /**
     * Process referral when a customer signs up
     * This is called from the auth service when a new customer registers
     */
    async processReferralSignup(customerEmail: string): Promise<void> {
        const email = customerEmail.toLowerCase();

        // Find pending referral for this email
        const referral = await this.referralRepo.findOne({
            where: {
                referredEmail: email,
                status: 'pending',
            },
        });

        if (!referral) {
            return; // No referral found, nothing to do
        }

        // Check if referral is expired
        if (referral.expiresAt && referral.expiresAt < new Date()) {
            referral.status = 'expired';
            await this.referralRepo.save(referral);
            return;
        }

        // Generate unique coupon code
        let couponCode = this.generateCouponCode();
        let attempts = 0;
        const maxAttempts = 10;
        let coupon: Coupon | null = null;

        // Try to create coupon with unique code
        while (attempts < maxAttempts) {
            try {
                const validityDate = new Date();
                validityDate.setDate(validityDate.getDate() + 90);

                coupon = await this.couponsService.create({
                    code: couponCode,
                    type: 'percent',
                    value: 10,
                    validity: validityDate.toISOString().split('T')[0],
                    usageLimit: 1,
                    status: 'enable',
                });

                break; // Successfully created
            } catch (error) {
                if (
                    error.message &&
                    (error.message.includes('already exists') ||
                        error.message.includes('Coupon code already exists'))
                ) {
                    // Code exists, generate new one
                    couponCode = this.generateCouponCode();
                    attempts++;
                } else {
                    // Some other error, log and throw
                    console.error('Error creating referral coupon:', error);
                    throw error;
                }
            }
        }

        if (attempts >= maxAttempts || !coupon) {
            throw new BadRequestException(
                'Failed to generate unique coupon code. Please try again.',
            );
        }

        // Update referral
        referral.status = 'signed_up';
        referral.couponCode = couponCode;
        referral.couponId = coupon.id;
        referral.signedUpAt = new Date();

        await this.referralRepo.save(referral);

        // Get referrer details to send notification email
        const referrer = await this.customerRepo.findOne({
            where: { id: referral.referrerId },
        });

        // Send notification email to referrer about the successful referral (asynchronously)
        if (referrer && referrer.email) {
            const frontendUrl = this.configService.get<string>('FRONTEND_URL');
            this.emailService.sendReferralRewardEmail(
                referrer.email,
                referrer.fullname,
                referral.referredEmail,
                couponCode,
                frontendUrl ? `${frontendUrl.replace(/\/$/, '')}/my-account/referrals` : undefined,
            ).catch(error => {
                console.error('Failed to send referral reward email:', error);
            });
        }
    }
}

