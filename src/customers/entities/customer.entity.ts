import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { VisaApplication } from '../../visa-applications/entities/visa-application.entity';
import { CardInfo } from '../../card-info/entities/card-info.entity';
import { Payment } from '../../payments/entities/payment.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fullname: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password?: string;

  @Column({ nullable: true })
  residenceCountry?: string;

  @Column({ nullable: true })
  nationality?: string; // Customer's nationality

  @Column({ nullable: true })
  passportNumber?: string; // Customer's passport number

  @Column({ nullable: true })
  passportNationality?: string; // Customer's passport nationality

  @Column({ type: 'date', nullable: true })
  passportExpiryDate?: Date; // Customer's passport expiry date

  @Column({ type: 'date', nullable: true })
  dateOfBirth?: Date; // Customer's date of birth

  @Column({ nullable: true })
  phoneNumber?: string; // Customer's phone number

  @Column({ default: false })
  hasSchengenVisa: boolean; // Customer's Schengen visa status

  @Column({ default: 'Active' })
  status: string; // Active, Inactive, Suspended

  @Column({ default: 'customer' })
  role: string; // 'customer' or 'admin'

  // ✅ ADD THIS FIELD - For storing admin notes/resubmission requests
  @Column({ nullable: true, type: 'text' })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => VisaApplication, application => application.customer)
  applications?: VisaApplication[];

  @OneToMany(() => CardInfo, cardInfo => cardInfo.customer)
  cards?: CardInfo[];

  @OneToMany(() => Payment, payment => payment.customer)
  payments?: Payment[];
}
