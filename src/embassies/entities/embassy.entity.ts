import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('embassies')
export class Embassy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  destinationCountry: string;

  @Column()
  originCountry: string;

  @Column()
  embassyName: string;

  @Column()
  address: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

