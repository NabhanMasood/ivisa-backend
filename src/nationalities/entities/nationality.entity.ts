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

  @Column({ nullable: true })
  govtFee: number;

  @Column({ nullable: true })
  serviceFee: number;

  @Column({ nullable: true })
  totalAmount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
