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
  processingType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  processingTime: string;

  @Column({ type: 'int', nullable: true })
  processingFeeId: number;

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
  notes: string;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
