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
import { VisaProduct } from '../../visa-product/entities/visa-product.entity';
import { Coupon } from '../../coupons/entities/coupon.entity';

@Entity('incomplete_applications')
export class IncompleteApplication {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @ManyToOne(() => Customer, { nullable: true, eager: false })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column({ nullable: true })
  customerId: number | null;

  @ManyToOne(() => VisaProduct, { eager: false, nullable: true })
  @JoinColumn({ name: 'visaProductId' })
  visaProduct: VisaProduct;

  @Column({ nullable: true })
  visaProductId: number | null;

  @Column({ nullable: true })
  nationality: string;

  @Column({ nullable: true })
  destinationCountry: string;

  @Column({ nullable: true })
  visaType: string;

  @Column({ type: 'int', nullable: true, default: 1 })
  numberOfTravelers: number;

  // Track if pending email has been sent
  @Column({ default: false })
  pendingEmailSent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  pendingEmailSentAt: Date | null;

  // Track if coupon email has been sent
  @Column({ default: false })
  couponEmailSent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  couponEmailSentAt: Date | null;

  // Reference to the coupon that was sent
  @ManyToOne(() => Coupon, { nullable: true, eager: false })
  @JoinColumn({ name: 'sentCouponId' })
  sentCoupon: Coupon;

  @Column({ nullable: true })
  sentCouponId: number | null;

  // Link to the actual visa application if it gets created
  @Column({ nullable: true })
  visaApplicationId: number | null;

  // Track if the application was eventually submitted
  @Column({ default: false })
  applicationSubmitted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

