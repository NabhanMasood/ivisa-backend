import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  
  @Entity('processing_options')
  export class ProcessingOption {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column({ unique: true })
    type: string; 
  
    @Column()
    name: string; 
  
    @Column()
    processingTime: string; 
  
    @Column('decimal', { precision: 10, scale: 2 })
    fee: number; // Processing fee amount (5320 or 15320 PKR)
  
    @Column({ nullable: true, type: 'text' })
    description: string; 
  
    @Column({ default: true })
    isActive: boolean;
  
    @Column({ default: 0 })
    displayOrder: number; 
  
    @Column({ nullable: true })
    estimatedDays: number; // Estimated processing days (1, 0, 0)
  
    @Column({ nullable: true })
    estimatedHours: number;
  
    @Column({ nullable: true, type: 'json' })
    metadata: Record<string, any>; 
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }