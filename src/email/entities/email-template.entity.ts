import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

/**
 * Email Template Entity
 * Stores SendGrid Dynamic Template IDs for different email types
 * Allows users/admins to design emails in SendGrid and reference them by name
 */
@Entity('email_templates')
export class EmailTemplate {
    @PrimaryGeneratedColumn()
    id: number;

    /**
     * Template name/identifier (e.g., 'welcome', 'application_submitted', 'payment_confirmation')
     * Used to look up templates in code
     */
    @Column({ unique: true })
    name: string;

    /**
     * SendGrid Dynamic Template ID (e.g., 'd-93a14859b7...')
     * This is the template ID from SendGrid dashboard
     */
    @Column()
    sendgridTemplateId: string;

    /**
     * Human-readable description of when this template is used
     */
    @Column({ nullable: true })
    description: string;

    /**
     * Whether this template is active
     * Inactive templates won't be used even if configured
     */
    @Column({ default: true })
    isActive: boolean;

    /**
     * Category/group for organizing templates
     * e.g., 'customer', 'admin', 'system'
     */
    @Column({ nullable: true })
    category: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

