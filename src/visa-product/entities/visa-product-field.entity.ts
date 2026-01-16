import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { VisaProduct } from './visa-product.entity';
import { VisaApplicationFieldResponse } from './visa-application-field-response.entity';

export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  UPLOAD = 'upload',
  DROPDOWN = 'dropdown',
  TEXTAREA = 'textarea',
}

@Entity('visa_product_fields')
export class VisaProductField {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => VisaProduct, (visaProduct) => visaProduct.fields, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'visaProductId' })
  visaProduct: VisaProduct;

  @Column()
  visaProductId: number;

  @Column({ type: 'varchar', length: 50 })
  fieldType: FieldType; // text, number, date, upload, dropdown, textarea

  @Column({ type: 'text' })
  question: string; // The statement/question for the field

  @Column({ type: 'text', nullable: true })
  placeholder?: string; // Optional placeholder text

  @Column({ type: 'boolean', default: false })
  isRequired: boolean; // Whether the field is required

  @Column({ type: 'int', default: 0 })
  displayOrder: number; // Order in which fields should be displayed

  // For dropdown fields - store options as JSON array
  @Column({ type: 'json', nullable: true })
  options?: string[]; // e.g., ["Option 1", "Option 2", "Option 3"]

  // For dropdown fields - use countries list instead of custom options
  @Column({ type: 'boolean', default: false })
  useCountriesList?: boolean; // If true, populate dropdown from countries API

  // For upload fields - allowed file types
  @Column({ type: 'json', nullable: true })
  allowedFileTypes?: string[]; // e.g., ["image/jpeg", "image/png", "application/pdf"]

  // For upload fields - max file size in MB
  @Column({ type: 'int', nullable: true })
  maxFileSizeMB?: number;

  // For text/number fields - validation rules
  @Column({ type: 'int', nullable: true })
  minLength?: number;

  @Column({ type: 'int', nullable: true })
  maxLength?: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // Whether the field is currently active

  @OneToMany(
    () => VisaApplicationFieldResponse,
    (response) => response.field,
  )
  responses: VisaApplicationFieldResponse[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

