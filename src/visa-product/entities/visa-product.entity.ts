import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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

  @Column('decimal', { precision: 10, scale: 2 })
  govtFee: number;

  @Column('decimal', { precision: 10, scale: 2 })
  serviceFee: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
