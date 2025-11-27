export class ReferralResponseDto {
    id: number;
    referrerId: number;
    referredEmail: string;
    status: 'pending' | 'signed_up' | 'expired';
    couponCode: string | null;
    signedUpAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

