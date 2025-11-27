import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    ParseIntPipe,
    BadRequestException,
    Req,
} from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { CreateReferralDto } from './dto/create-referral.dto';
import * as jwt from 'jsonwebtoken';

@Controller('referrals')
export class ReferralsController {
    constructor(private readonly referralsService: ReferralsService) { }

    /**
     * Extract customer ID from JWT token in cookies or Authorization header
     */
    private getCustomerIdFromRequest(req: any): number {
        try {
            // Try to get token from cookies first
            let token = req.cookies?.auth_token;

            // If not in cookies, try Authorization header
            if (!token) {
                const authHeader = req.headers?.authorization;
                if (authHeader && authHeader.startsWith('Bearer ')) {
                    token = authHeader.substring(7);
                }
            }

            if (!token) {
                throw new BadRequestException('Authentication required. Please provide a valid token in cookies or Authorization header.');
            }

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || 'SECRET_KEY',
            ) as { id: number; email: string; role?: string; type?: string };

            // Only allow customer role
            if (decoded.role !== 'customer' && decoded.type !== 'customer') {
                throw new BadRequestException('Invalid user type. Only customers can access this endpoint.');
            }

            return decoded.id;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            if (error.name === 'JsonWebTokenError') {
                throw new BadRequestException('Invalid authentication token');
            }
            if (error.name === 'TokenExpiredError') {
                throw new BadRequestException('Authentication token expired. Please login again.');
            }
            throw new BadRequestException(error.message || 'Authentication failed');
        }
    }

    /**
     * POST /referrals
     * Send a referral invitation
     */
    @Post()
    async sendReferral(@Body() body: any, @Req() req: any) {
        try {
            // Handle different field names from frontend
            const referredEmail = body.referredEmail || body.email || body.referred_email;

            if (!referredEmail) {
                throw new BadRequestException({
                    status: false,
                    message: 'Email address is required. Please provide referredEmail, email, or referred_email field.',
                });
            }

            const createDto: CreateReferralDto = {
                referredEmail: referredEmail,
            };

            const referrerId = this.getCustomerIdFromRequest(req);
            return await this.referralsService.sendReferral(referrerId, createDto);
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException({
                status: false,
                message: error.message || 'Failed to send referral invitation',
            });
        }
    }

    /**
     * GET /referrals/my
     * Get all referrals for the current user
     */
    @Get('my')
    async getMyReferrals(@Req() req: any) {
        try {
            const referrerId = this.getCustomerIdFromRequest(req);
            return await this.referralsService.getMyReferrals(referrerId);
        } catch (error) {
            throw new BadRequestException({
                status: false,
                message: error.message || 'Failed to fetch referrals',
            });
        }
    }

    /**
     * GET /referrals/:id
     * Get a single referral by ID
     */
    @Get(':id')
    async getReferralById(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: any,
    ) {
        try {
            const referrerId = this.getCustomerIdFromRequest(req);
            return await this.referralsService.getReferralById(referrerId, id);
        } catch (error) {
            throw new BadRequestException({
                status: false,
                message: error.message || 'Failed to fetch referral',
            });
        }
    }
}

