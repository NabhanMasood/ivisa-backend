import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';

export type ReferralStatus = 'pending' | 'signed_up' | 'expired';

@Entity('referrals')
export class Referral {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Customer, { eager: false })
    @JoinColumn({ name: 'referrerId' })
    referrer: Customer;

    @Column()
    referrerId: number;

    @Column({ type: 'varchar', length: 255 })
    referredEmail: string;

    @Column({
        type: 'varchar',
        length: 20,
        default: 'pending',
    })
    status: ReferralStatus;

    @Column({ type: 'varchar', length: 64, nullable: true })
    couponCode: string | null;

    @Column({ type: 'int', nullable: true })
    couponId: number | null;

    @Column({ type: 'timestamp', nullable: true })
    signedUpAt: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    expiresAt: Date | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

