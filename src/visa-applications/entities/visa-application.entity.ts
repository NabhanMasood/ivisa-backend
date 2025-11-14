import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    JoinColumn,
  } from 'typeorm';
  import { Customer } from '../../customers/entities/customer.entity';
  import { VisaProduct } from '../../visa-product/entities/visa-product.entity';
  import { Traveler } from '../../travelers/entities/traveler.entity';
  import { Payment } from '../../payments/entities/payment.entity';
  
  @Entity('visa_applications')
  export class VisaApplication {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column({ unique: true })
    applicationNumber: string; // VAP-2025-001234
  
    // Customer/Applicant Info
    @ManyToOne(() => Customer, { eager: false })
    @JoinColumn({ name: 'customerId' })
    customer: Customer;
  
    @Column()
    customerId: number;
  
    // Visa Product Reference
    @ManyToOne(() => VisaProduct, { eager: true })
    @JoinColumn({ name: 'visaProductId' })
    visaProduct: VisaProduct;
  
    @Column()
    visaProductId: number;
  
    // Trip Info (from Step 1 - TripInfoForm.vue)
    @Column()
    nationality: string; // User's nationality (e.g., "Pakistan")
  
    @Column()
    destinationCountry: string; // Where they're going (e.g., "Morocco")
  
    @Column()
    visaType: string; // '180-single', '180-multiple', '90-single'
  
    @Column()
    numberOfTravelers: number; // Number of applicants
  
    // Processing Selection (from Step 4 - CheckoutForm.vue)
    @Column({ nullable: true })
    processingType: string; // 'standard' | 'rush' | 'super-rush'
  
    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    processingFee: number; // 5320 or 15320 PKR
  
    // Fees Breakdown
    @Column('decimal', { precision: 10, scale: 2 })
    governmentFee: number; // 3667.16 PKR per traveler
  
    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    serviceFee: number; // Your company's service fee
  
    @Column('decimal', { precision: 10, scale: 2 })
    totalAmount: number; // Government fee + Processing fee + Service fee
  
    // Status Tracking
    @Column({ default: 'draft' })
    status: string; // draft, submitted, processing, under_review, approved, rejected, cancelled
  
    @Column({ nullable: true })
    submittedAt: Date;
  
    @Column({ nullable: true })
    approvedAt: Date;
  
    @Column({ nullable: true, type: 'text' })
    rejectionReason: string;
  
    @Column({ nullable: true, type: 'text' })
    notes: string; // Internal notes
  
    // Relations
    @OneToMany(() => Traveler, (traveler) => traveler.application, {
      cascade: true,
    })
    travelers: Traveler[];
  
    @OneToOne(() => Payment, (payment) => payment.application, {
      cascade: true,
    })
    payment: Payment;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }