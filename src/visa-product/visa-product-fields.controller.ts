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
import { memoryStorage } from 'multer';
import { VisaProductFieldsService } from './visa-product-fields.service';
import { CreateVisaProductFieldDto } from './dto/create-visa-product-field.dto';
import { UpdateVisaProductFieldDto } from './dto/update-visa-product-field.dto';
import { SubmitFieldResponseDto } from './dto/submit-field-response.dto';
import { CloudinaryService } from '../common/cloudinary.service';
import { BatchGetFieldsDto } from './dto/batch-get-fields.dto';
import { BatchSaveFieldsDto } from './dto/batch-save-fields.dto';

@Controller('visa-product-fields')
export class VisaProductFieldsController {
  constructor(
    private readonly visaProductFieldsService: VisaProductFieldsService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  /**
   * Create a new custom field for a visa product (Admin only)
   */
  @Post()
  create(@Body() createDto: CreateVisaProductFieldDto) {
    // Debug log to verify displayOrder is received correctly
    console.log('📥 Creating field with displayOrder:', createDto.displayOrder, 'question:', createDto.question);
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
   * Bulk delete custom fields (Admin only)
   * Body: { fieldIds: number[] }
   */
  @Delete('bulk')
  bulkRemove(@Body() body: { fieldIds: number[] }) {
    return this.visaProductFieldsService.bulkRemove(body.fieldIds);
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
   * @param fieldId - Field ID to validate against field constraints (can be positive for product fields or negative for admin fields)
   * @param applicationId - Application ID (required for negative field IDs to look up admin-requested fields)
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB default limit
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('fieldId') fieldId?: string,
    @Query('applicationId') applicationId?: string,
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

        // ✅ NEW: For negative field IDs (admin fields), applicationId is required
        const applicationIdNum = applicationId ? parseInt(applicationId, 10) : undefined;
        if (fieldIdNum < 0 && !applicationIdNum) {
          throw new BadRequestException(
            'applicationId is required for admin-requested fields (negative field IDs)',
          );
        }

        await this.visaProductFieldsService.validateFileUpload(
          fieldIdNum,
          file,
          applicationIdNum,
        );
      }

      // Upload to Cloudinary
      const uploadResult = await this.cloudinaryService.uploadFile(
        file,
        'ivisa123/application-files',
      );

      return {
        status: true,
        message: 'File uploaded successfully',
        data: {
          filePath: uploadResult.url,
          fileName: file.originalname,
          fileSize: uploadResult.bytes,
          mimeType: file.mimetype,
        },
      };
    } catch (error) {
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
  submitResponses(@Body() rawBody: any) {
    // Log raw body first to see what we actually receive
    console.log(`📥 [CONTROLLER RAW] Received raw body:`, JSON.stringify({
      applicationId: rawBody.applicationId,
      travelerId: rawBody.travelerId,
      responsesCount: rawBody.responses?.length,
      firstResponse: rawBody.responses?.[0],
    }, null, 2));

    // Manually construct the DTO to preserve passport field string IDs
    const submitDto: SubmitFieldResponseDto = {
      applicationId: Number(rawBody.applicationId),
      travelerId: rawBody.travelerId ? Number(rawBody.travelerId) : undefined,
      responses: (rawBody.responses || []).map((r: any) => ({
        fieldId: r.fieldId, // Preserve as-is (string or number)
        value: r.value,
        filePath: r.filePath,
        fileName: r.fileName,
        fileSize: r.fileSize,
      })),
    };

    console.log(`📥 [CONTROLLER] Constructed submitDto with ${submitDto.responses?.length || 0} responses`);
    console.log(`📥 [CONTROLLER] First few responses:`, JSON.stringify(submitDto.responses?.slice(0, 5).map(r => ({ fieldId: r.fieldId, value: r.value, fieldIdType: typeof r.fieldId })), null, 2));

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
    @Query('viewMode') viewMode?: string, // 'admin' to show all fields, 'user' to restrict to requested fields
  ) {
    const travelerIdNum = travelerId ? parseInt(travelerId, 10) : undefined;
    const isAdminView = viewMode === 'admin';
    return this.visaProductFieldsService.getFieldsWithResponses(
      applicationId,
      travelerIdNum,
      isAdminView,
    );
  }

  /**
   * Batch fetch fields for multiple visa products
   * Returns fields grouped by visaProductId
   */
  @Post('batch-by-visa-products')
  batchGetFieldsByVisaProducts(@Body() batchDto: BatchGetFieldsDto) {
    return this.visaProductFieldsService.batchGetFieldsByVisaProducts(batchDto);
  }

  /**
   * Batch create/update fields for a visa product
   * If field has id, update it; if not, create new field
   */
  @Post('batch')
  batchSaveFields(@Body() body: any) {
    // Log raw body first to see what's actually being sent
    console.log('📥 Raw batch save body received:', JSON.stringify(body, null, 2));

    // Try to parse and validate
    const batchDto: BatchSaveFieldsDto = {
      visaProductId: body.visaProductId,
      fields: body.fields || [],
    };

    console.log('📥 Parsed batch save:', {
      visaProductId: batchDto.visaProductId,
      fieldsCount: batchDto.fields?.length,
      firstField: batchDto.fields?.[0],
      allFields: batchDto.fields?.map((f: any) => ({
        id: f?.id,
        question: f?.question,
        displayOrder: f?.displayOrder,
        fieldType: f?.fieldType,
      })),
    });

    return this.visaProductFieldsService.batchSaveFields(batchDto);
  }
}