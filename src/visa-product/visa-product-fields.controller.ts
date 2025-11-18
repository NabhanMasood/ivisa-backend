import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    HttpException,
    HttpStatus,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { diskStorage } from 'multer';
  import { extname } from 'path';
  import { VisaProductFieldsService } from './visa-product-fields.service';
  import { CreateVisaProductFieldDto } from './dto/create-visa-product-field.dto';
  import { UpdateVisaProductFieldDto } from './dto/update-visa-product-field.dto';
  import { SubmitFieldResponseDto } from './dto/submit-field-response.dto';
  
  @Controller('visa-product-fields')
  export class VisaProductFieldsController {
    constructor(
      private readonly visaProductFieldsService: VisaProductFieldsService,
    ) {}
  
    /**
     * Create a new custom field for a visa product (Admin only)
     */
    @Post()
    create(@Body() createDto: CreateVisaProductFieldDto) {
      return this.visaProductFieldsService.create(createDto);
    }
  
    /**
     * Get all fields for a visa product
     * @param visaProductId - The visa product ID
     * @param includeInactive - Whether to include inactive fields (default: false)
     */
    @Get('by-visa-product/:visaProductId')
    findByVisaProduct(
      @Param('visaProductId') visaProductId: number,
      @Query('includeInactive') includeInactive?: string,
    ) {
      return this.visaProductFieldsService.findByVisaProduct(
        visaProductId,
        includeInactive === 'true',
      );
    }
  
    /**
     * Get a single field by ID
     */
    @Get(':id')
    findOne(@Param('id') id: number) {
      return this.visaProductFieldsService.findOne(id);
    }
  
    /**
     * Update a custom field (Admin only)
     */
    @Patch(':id')
    update(
      @Param('id') id: number,
      @Body() updateDto: UpdateVisaProductFieldDto,
    ) {
      return this.visaProductFieldsService.update(id, updateDto);
    }
  
    /**
     * Delete a custom field (Admin only)
     */
    @Delete(':id')
    remove(@Param('id') id: number) {
      return this.visaProductFieldsService.remove(id);
    }
  
    /**
     * Upload a file for a form field
     * @param fieldId - Optional field ID to validate against field constraints
     */
    @Post('upload')
    @UseInterceptors(
      FileInterceptor('file', {
        storage: diskStorage({
          destination: './tmp/uploads/visa-applications',
          filename: (req, file, cb) => {
            const randomName = Array(32)
              .fill(null)
              .map(() => Math.round(Math.random() * 16).toString(16))
              .join('');
            cb(null, `${randomName}${extname(file.originalname)}`);
          },
        }),
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB default limit
        },
      }),
    )
    async uploadFile(
      @UploadedFile() file: Express.Multer.File,
      @Query('fieldId') fieldId?: string,
    ) {
      if (!file) {
        throw new BadRequestException('No file provided');
      }
  
      try {
        // If fieldId is provided, validate against field constraints
        if (fieldId) {
          const fieldIdNum = parseInt(fieldId, 10);
          if (isNaN(fieldIdNum)) {
            throw new BadRequestException('Invalid fieldId');
          }
          await this.visaProductFieldsService.validateFileUpload(
            fieldIdNum,
            file,
          );
        }
  
        const filePath = `/uploads/visa-applications/${file.filename}`;
  
        return {
          status: true,
          message: 'File uploaded successfully',
          data: {
            filePath,
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
          },
        };
      } catch (error) {
        // Clean up uploaded file if validation fails
        if (file && file.path) {
          const fs = require('fs');
          try {
            fs.unlinkSync(file.path);
          } catch (unlinkError) {
            // Ignore unlink errors
          }
        }
  
        if (
          error instanceof BadRequestException ||
          error instanceof HttpException
        ) {
          throw error;
        }
        throw new BadRequestException(
          error.message || 'Error uploading file',
        );
      }
    }
  
    /**
     * Submit field responses for an application (User)
     */
    @Post('responses')
    submitResponses(@Body() submitDto: SubmitFieldResponseDto) {
      return this.visaProductFieldsService.submitResponses(submitDto);
    }
  
    /**
     * Get field responses for an application
     * @param applicationId - Application ID
     * @param travelerId - Optional query parameter: if provided, returns only responses for this traveler
     */
    @Get('responses/:applicationId')
    getResponses(
      @Param('applicationId') applicationId: number,
      @Query('travelerId') travelerId?: string,
    ) {
      const travelerIdNum = travelerId ? parseInt(travelerId, 10) : undefined;
      return this.visaProductFieldsService.getResponses(
        applicationId,
        travelerIdNum,
      );
    }
  
    /**
     * Get fields for an application with their existing responses (if any)
     * Useful for showing a form with pre-filled values
     * @param applicationId - Application ID
     * @param travelerId - Optional query parameter: if provided, returns fields with responses for this traveler
     */
    @Get('by-application/:applicationId')
    getFieldsWithResponses(
      @Param('applicationId') applicationId: number,
      @Query('travelerId') travelerId?: string,
    ) {
      const travelerIdNum = travelerId ? parseInt(travelerId, 10) : undefined;
      return this.visaProductFieldsService.getFieldsWithResponses(
        applicationId,
        travelerIdNum,
      );
    }
  }