import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('guides')
export class Guide {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  slug: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text' })
  content: string; // HTML content

  @Column()
  category: string;

  @Column({ nullable: true })
  featuredImage: string; // Cloudinary URL to featured image

  @Column({ default: true })
  isPublished: boolean; // Whether the guide is published

  @Column({ default: false })
  isFeatured: boolean; // Whether the guide is featured (highlighted)

  @Column({ default: 0 })
  viewCount: number; // Track views

  @Column({ type: 'jsonb', nullable: true })
  relatedGuideIds: number[]; // Array of related guide IDs

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

