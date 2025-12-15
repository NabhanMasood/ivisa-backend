import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { EmailTemplatesService } from './email-templates.service';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';

@Controller('email-templates')
// Note: Authentication is handled by AuthMiddleware in app.module.ts
export class EmailTemplatesController {
  constructor(private readonly emailTemplatesService: EmailTemplatesService) {}

  @Post()
  async create(@Body() createDto: CreateEmailTemplateDto) {
    const template = await this.emailTemplatesService.create(createDto);
    return {
      status: true,
      message: 'Email template created successfully',
      data: template,
    };
  }

  @Get()
  async findAll() {
    const templates = await this.emailTemplatesService.findAll();
    return {
      status: true,
      message: 'Email templates retrieved successfully',
      count: templates.length,
      data: templates,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const template = await this.emailTemplatesService.findOne(id);
    return {
      status: true,
      message: 'Email template retrieved successfully',
      data: template,
    };
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateEmailTemplateDto,
  ) {
    const template = await this.emailTemplatesService.update(id, updateDto);
    return {
      status: true,
      message: 'Email template updated successfully',
      data: template,
    };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.emailTemplatesService.remove(id);
    return {
      status: true,
      message: 'Email template deleted successfully',
    };
  }
}

