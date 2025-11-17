import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { VisaApplication } from '../../visa-applications/entities/visa-application.entity';

@Entity('travelers')
export class Traveler {
  @PrimaryGeneratedColumn()
  id: number;

  // Link to visa application
  @ManyToOne(() => VisaApplication, (application) => application.travelers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'applicationId' })
  application: VisaApplication;

  @Column()
  applicationId: number;

  // Personal Information (Step 2 - YourInfoForm.vue)
  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'varchar', nullable: true }) // Explicitly specify type as varchar
  email: string;
  
  @Column({ type: 'date' })
  dateOfBirth: Date;
  
  // Passport Details (Step 3 - PassportDetailsForm.vue)
  @Column({ nullable: true })
  passportNationality: string;

  @Column({ nullable: true })
  passportNumber: string;

  @Column({ type: 'date', nullable: true })
  passportExpiryDate: Date;

  @Column({ nullable: true })
  residenceCountry: string;

  @Column({ default: false })
  hasSchengenVisa: boolean;

  // Optional: Additional fields for future enhancements
  @Column({ nullable: true })
  placeOfBirth: string;

  @Column({ nullable: true })
  passportIssueDate: Date;

  @Column({ nullable: true })
  passportIssuePlace: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  // Store traveler-specific field responses as JSON object
  // IMPORTANT: fieldId must be the actual field.id from visa_product_fields, NOT array index
  // Structure: { fieldId: { value, filePath, fileName, fileSize, submittedAt } }
  // Example: { "5": { "value": "3232323", "submittedAt": "2025-11-15T13:14:18.993Z" } }
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
