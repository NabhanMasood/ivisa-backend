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
import { Embassy } from '../../embassies/entities/embassy.entity';

// ✅ NEW: Interface for resubmission requests
export interface ResubmissionRequest {
  id: string;
  target: 'application' | 'traveler';
  travelerId?: number | null;
  fieldIds: number[];
  note?: string | null;
  requestedAt: Date | string;
  fulfilledAt?: Date | string | null;
}

@Entity('visa_applications')
export class VisaApplication {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  applicationNumber: string;

  @ManyToOne(() => Customer, { eager: false })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column()
  customerId: number;

  @ManyToOne(() => VisaProduct, { eager: true })
  @JoinColumn({ name: 'visaProductId' })
  visaProduct: VisaProduct;

  @Column()
  visaProductId: number;

  @Column()
  nationality: string;

  @Column()
  destinationCountry: string;

  @ManyToOne(() => Embassy, { eager: false, nullable: true })
  @JoinColumn({ name: 'embassyId' })
  embassy: Embassy;

  @Column({ type: 'int', nullable: true })
  embassyId: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber: string;

  @Column()
  visaType: string;

  @Column()
  numberOfTravelers: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  processingType: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  processingTime: string | null;

  @Column({ type: 'int', nullable: true })
  processingFeeId: number | null;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  processingFee: number;

  @Column('decimal', { precision: 10, scale: 2 })
  governmentFee: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  serviceFee: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ default: 'draft' })
  status: string;

  @Column({ nullable: true })
  submittedAt: Date;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ nullable: true, type: 'text' })
  rejectionReason: string;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @Column({ type: 'jsonb', nullable: true })
  resubmissionRequests?: ResubmissionRequest[] | null;

  @Column({ type: 'int', nullable: true })
  resubmissionTravelerId?: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  resubmissionTarget?: string | null;

  @Column({ type: 'json', nullable: true })
  requestedFieldIds?: number[] | null;

  @Column({ type: 'json', nullable: true })
  requestedFieldIdsByTraveler?: Record<number | string, number[]>;

  @Column({ type: 'json', nullable: true })
  adminRequestedFields?: any[];

  @Column({ type: 'int', nullable: true, default: 0 })
  adminRequestedFieldMinId?: number;

  @OneToMany(() => Traveler, (traveler) => traveler.application, {
    cascade: true,
  })
  travelers: Traveler[];

  @OneToOne(() => Payment, (payment) => payment.application, {
    cascade: true,
  })
  payment: Payment;

  @Column({ type: 'json', nullable: true })
  fieldResponses?: Record<string | number, {
    value?: string;
    filePath?: string;
    fileName?: string;
    fileSize?: number;
    submittedAt?: Date;
  }>;

  // Email tracking for pending application reminders
  @Column({ type: 'varchar', length: 255, nullable: true })
  emailCaptured?: string | null; // Email captured on first step

  @Column({ type: 'timestamp', nullable: true })
  emailCapturedAt?: Date | null; // When email was first captured

  @Column({ type: 'timestamp', nullable: true })
  pendingReminderSentAt?: Date | null; // When pending reminder email was sent

  @Column({ type: 'timestamp', nullable: true })
  couponEmailSentAt?: Date | null; // When coupon email was sent

  // Step-by-step draft data storage
  @Column({ type: 'jsonb', nullable: true })
  draftData?: {
    step1?: any; // Step 1: Trip info (nationality, destination, visaType, email, productDetails)
    step2?: any; // Step 2: Travelers info (travelers array with personal details)
    step3?: any; // Step 3: Passport details (passportDetails array)
    step4?: any; // Step 4: Embassy selection (embassyId, embassy details)
    step5?: any; // Step 5: Processing options (processingType, processingFee, etc.)
    currentStep?: number; // Current step user is on (1-6)
  } | null;

  @Column({ type: 'int', nullable: true })
  currentStep?: number | null; // Track which step user is on (1-6)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
