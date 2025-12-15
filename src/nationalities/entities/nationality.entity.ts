import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('nationalities')
export class Nationality {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nationality: string; // from Countries.countryName

  @Column()
  destination: string; // from VisaProduct.country

  @Column()
  productName: string; // selected visa product

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  govtFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  serviceFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalAmount: number;

  @Column({ type: 'boolean', default: false })
  isFreeVisa: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
