import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { VisaProductField } from './visa-product-field.entity';
import { VisaApplication } from '../../visa-applications/entities/visa-application.entity';

@Entity('visa_application_field_responses')
export class VisaApplicationFieldResponse {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => VisaApplication, (application) => application.fieldResponses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'applicationId' })
  application: VisaApplication;

  @Column()
  applicationId: number;

  @ManyToOne(() => VisaProductField, (field) => field.responses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'fieldId' })
  field: VisaProductField;

  @Column()
  fieldId: number;

  // Store response value - can be text, number, date string, file path, or selected option
  @Column({ type: 'text', nullable: true })
  value?: string; // For text, number (as string), date, dropdown option

  // For upload fields - store file path
  @Column({ type: 'varchar', length: 500, nullable: true })
  filePath?: string; // Path to uploaded file

  // For upload fields - store original filename
  @Column({ type: 'varchar', length: 255, nullable: true })
  fileName?: string; // Original filename

  // For upload fields - store file size
  @Column({ type: 'bigint', nullable: true })
  fileSize?: number; // File size in bytes

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

