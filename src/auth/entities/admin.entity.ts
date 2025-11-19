import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type AdminRole = 'superadmin' | 'subadmin';

export interface AdminPermissions {
  countries: boolean;
  visaProducts: boolean;
  nationalities: boolean;
  embassies: boolean;
  coupons: boolean;
  additionalInfo: boolean;
  customers: boolean;
  applications: boolean;
  finances: boolean;
}

@Entity('auth') // ← specify table name as 'auth'
export class Admin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'varchar', default: 'superadmin' })
  role: AdminRole;

  @Column({ type: 'jsonb', nullable: true })
  permissions: AdminPermissions;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
