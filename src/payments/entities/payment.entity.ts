import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    ManyToOne,
    JoinColumn,
  } from 'typeorm';
  import { VisaApplication } from '../../visa-applications/entities/visa-application.entity';
  import { CardInfo } from '../../card-info/entities/card-info.entity';
  import { Customer } from '../../customers/entities/customer.entity';
  
  @Entity('payments')
  export class Payment {
    @PrimaryGeneratedColumn()
    id: number;
  
    // Link to visa application (One-to-One)
    @OneToOne(() => VisaApplication, (application) => application.payment, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'applicationId' })
    application: VisaApplication;
  
    @Column()
    applicationId: number;

    // Link to customer (Many-to-One)
    @ManyToOne(() => Customer, { eager: false, nullable: true })
    @JoinColumn({ name: 'customerId' })
    customer: Customer;

    @Column({ nullable: true })
    customerId: number;
  
    // Payment Amount
    @Column('decimal', { precision: 10, scale: 2 })
    amount: number;
  
    @Column({ default: 'USD' })
    currency: string; // PKR, USD, EUR, etc.
  
    // Payment Method
    @Column()
    paymentMethod: string; // card, bank_transfer, wallet
  
    @Column({ default: 'pending' })
    status: string; // pending, processing, completed, failed, refunded
  
    // Transaction Details
    @Column({ nullable: true })
    transactionId: string; // Stripe/PaymentGateway transaction ID
  
    @Column({ nullable: true })
    paymentGateway: string; // stripe, paypal, razorpay, etc.
  
    // Reference to saved card (optional - for payments using saved cards)
    @ManyToOne(() => CardInfo, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'cardInfoId' })
    cardInfo: CardInfo;
  
    @Column({ nullable: true })
    cardInfoId: number;
  
    // Card Details (for card payments - kept for backward compatibility and one-time payments)
    @Column({ nullable: true })
    cardholderName: string;
  
    @Column({ nullable: true })
    cardLast4: string; // Last 4 digits of card
  
    @Column({ nullable: true })
    cardBrand: string; // visa, mastercard, amex
  
    // Payment Intent (for Stripe or similar)
    @Column({ nullable: true })
    paymentIntentId: string;
  
    @Column({ nullable: true })
    clientSecret: string; // For frontend payment confirmation
  
    // Timestamps
    @Column({ nullable: true })
    paidAt: Date;
  
    @Column({ nullable: true })
    failedAt: Date;
  
    @Column({ nullable: true, type: 'text' })
    failureReason: string;
  
    @Column({ nullable: true })
    refundedAt: Date;
  
    @Column({ nullable: true, type: 'text' })
    refundReason: string;
  
    // Metadata
    @Column({ nullable: true, type: 'text' })
    notes: string;
  
    @Column({ nullable: true, type: 'json' })
    metadata: Record<string, any>; // Additional payment gateway data
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }