import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ProcessingFee } from './processing-fee.entity';

@Entity('visa_products')
export class VisaProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  country: string;

  @Column()
  productName: string;

  @Column('int')
  duration: number;

  @Column('int')
  validity: number;

  @Column({ type: 'varchar', length: 20, default: 'single' })
  entryType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  customEntryName?: string;

  @Column('decimal', { precision: 10, scale: 2 })
  govtFee: number;

  @Column('decimal', { precision: 10, scale: 2 })
  serviceFee: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @OneToMany(() => ProcessingFee, (processingFee) => processingFee.visaProduct, {
    cascade: true,
    eager: true,
  })
  processingFees: ProcessingFee[];

  // Store all custom fields as JSON array
  @Column({ type: 'json', nullable: true })
  fields?: any[]; // Array of field objects

  // Track the highest field ID ever used to ensure IDs are never reused
  @Column({ type: 'int', default: 0, nullable: true })
  maxFieldId?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
