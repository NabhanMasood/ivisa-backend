import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { VisaProduct } from './visa-product.entity';

@Entity('processing_fees')
export class ProcessingFee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  visaProductId: number;

  @ManyToOne(() => VisaProduct, (visaProduct) => visaProduct.processingFees, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'visaProductId' })
  visaProduct: VisaProduct;

  @Column()
  feeType: string; // e.g., "Standard", "Express", "Rush"

  @Column('int')
  timeValue: number; // e.g., 24, 48, 3, 5

  @Column({ type: 'varchar', length: 10 })
  timeUnit: string; // 'hours' or 'days'

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;
}