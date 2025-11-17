import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('coupons')
@Unique(['code'])
export class Coupon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64 })
  code: string;

  @Column({ type: 'varchar', length: 16 })
  type: 'percent' | 'amount';

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  value: number | null; // For 'percent': percentage value (e.g., 10 for 10%), For 'amount': fixed discount amount

  @Column({ type: 'date' })
  validity: string;

  @Column({ type: 'int', nullable: true, default: null })
  usageLimit: number | null; // null = unlimited usage

  @Column({ type: 'int', default: 0 })
  usageCount: number; // Current number of times used

  @Column({ type: 'varchar', length: 16, default: 'enable' })
  status: 'enable' | 'disable';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


