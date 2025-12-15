import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplate } from './entities/email-template.entity';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';

@Injectable()
export class EmailTemplatesService {
  constructor(
    @InjectRepository(EmailTemplate)
    private emailTemplateRepo: Repository<EmailTemplate>,
  ) {}

  /**
   * Create a new email template
   */
  async create(createDto: CreateEmailTemplateDto): Promise<EmailTemplate> {
    // Check if template with this name already exists
    const existing = await this.emailTemplateRepo.findOne({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new BadRequestException(
        `Email template with name "${createDto.name}" already exists`,
      );
    }

    const template = this.emailTemplateRepo.create({
      ...createDto,
      isActive: createDto.isActive !== undefined ? createDto.isActive : true,
    });

    return await this.emailTemplateRepo.save(template);
  }

  /**
   * Get all email templates
   */
  async findAll(): Promise<EmailTemplate[]> {
    return await this.emailTemplateRepo.find({
      order: { name: 'ASC' },
    });
  }

  /**
   * Get a single email template by ID
   */
  async findOne(id: number): Promise<EmailTemplate> {
    const template = await this.emailTemplateRepo.findOne({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Email template with ID ${id} not found`);
    }

    return template;
  }

  /**
   * Get email template by name
   */
  async findByName(name: string): Promise<EmailTemplate | null> {
    return await this.emailTemplateRepo.findOne({
      where: { name },
    });
  }

  /**
   * Update an email template
   */
  async update(
    id: number,
    updateDto: UpdateEmailTemplateDto,
  ): Promise<EmailTemplate> {
    const template = await this.findOne(id);

    // If name is being updated, check for conflicts
    if (updateDto.name && updateDto.name !== template.name) {
      const existing = await this.emailTemplateRepo.findOne({
        where: { name: updateDto.name },
      });

      if (existing) {
        throw new BadRequestException(
          `Email template with name "${updateDto.name}" already exists`,
        );
      }
    }

    Object.assign(template, updateDto);
    return await this.emailTemplateRepo.save(template);
  }

  /**
   * Delete an email template
   */
  async remove(id: number): Promise<void> {
    const template = await this.findOne(id);
    await this.emailTemplateRepo.remove(template);
  }
}

