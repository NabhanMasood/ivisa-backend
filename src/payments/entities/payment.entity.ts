import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
  } from 'typeorm';
  import { VisaApplication } from '../../visa-applications/entities/visa-application.entity';
  
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
  
    // Payment Amount
    @Column('decimal', { precision: 10, scale: 2 })
    amount: number;
  
    @Column({ default: 'PKR' })
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
  
    // Card Details (for card payments)
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