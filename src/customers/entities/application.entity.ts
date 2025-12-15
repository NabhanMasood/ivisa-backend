import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Customer } from './customer.entity';

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  applicationNumber: string; // APP-01245

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column()
  customerId: number;

  @Column()
  destination: string;

  @Column()
  visaProduct: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ default: 'Pending' })
  status: string; // Pending, In Review, Approved, Rejected

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

