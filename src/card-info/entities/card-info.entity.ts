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

@Entity('card_info')
export class CardInfo {
  @PrimaryGeneratedColumn()
  id: number;

  // Link to customer
  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column()
  customerId: number;

  // Card Details
  @Column()
  cardholderName: string;

  @Column({ nullable: true })
  cardLast4: string; // Last 4 digits of card (e.g., "1234")

  @Column({ nullable: true })
  cardBrand: string; // visa, mastercard, amex, etc.

  @Column({ nullable: true })
  expiryMonth: string; // e.g., "12"

  @Column({ nullable: true })
  expiryYear: string; // e.g., "2025"

  // Payment Gateway Information
  @Column({ nullable: true })
  paymentMethodId: string; // Stripe payment method ID or similar

  @Column({ nullable: true })
  paymentGateway: string; // stripe, paypal, razorpay, etc.

  // Card Status
  @Column({ default: true })
  isActive: boolean; // Whether this card is active and can be used

  @Column({ default: false })
  isDefault: boolean; // Whether this is the default card for the customer

  // Additional metadata
  @Column({ nullable: true, type: 'json' })
  metadata: Record<string, any>; // Additional payment gateway data

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

