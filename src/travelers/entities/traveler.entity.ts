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
  
    @Column()
    email: string;
    
    @Column({ type: 'date' })
    dateOfBirth: Date;
    
    // Passport Details (Step 3 - PassportDetailsForm.vue)
    @Column({ nullable: true })
    passportNationality: string; // Nationality on passport
  
    @Column({ nullable: true })
    passportNumber: string;
  
    @Column({ type: 'date', nullable: true })
    passportExpiryDate: Date;
  
    @Column({ nullable: true })
    residenceCountry: string; // Current residence country
  
    @Column({ default: false })
    hasSchengenVisa: boolean; // Do they have valid Schengen/USA/etc visa?
  
    // Optional: Additional fields for future enhancements
    @Column({ nullable: true })
    placeOfBirth: string;
  
    @Column({ nullable: true })
    passportIssueDate: Date;
  
    @Column({ nullable: true })
    passportIssuePlace: string;
  
    @Column({ nullable: true, type: 'text' })
    notes: string;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }