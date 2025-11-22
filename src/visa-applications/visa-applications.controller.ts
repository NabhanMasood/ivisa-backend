import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { VisaApplicationsService } from './visa-applications.service';
import { VisaApplicationsScheduler } from './visa-applications.scheduler';
import { CreateVisaApplicationDto } from './dto/create-visa-application.dto';
import { UpdateVisaApplicationDto } from './dto/update-visa-application.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { SelectProcessingDto } from './dto/select-processing.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { SubmitCompleteApplicationDto } from './dto/submit-complete-application.dto';


@Controller('visa-applications')
export class VisaApplicationsController {
  constructor(
    private readonly visaApplicationsService: VisaApplicationsService,
    private readonly visaApplicationsScheduler: VisaApplicationsScheduler,
  ) { }

  /**
   * POST /visa-applications/draft
   * Create a new visa application (Step 1 - Trip Info)
   */
  @Post('draft')
  async createDraft(@Body() createDto: CreateVisaApplicationDto) {
    try {
      return await this.visaApplicationsService.create(createDto);
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to create visa application',
      });
    }
  }

  /**
   * GET /visa-applications/summary
   * Get application statistics
   */
  @Get('summary')
  async getSummary() {
    try {
      return await this.visaApplicationsService.getSummary();
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch summary',
      });
    }
  }

  /**
   * GET /visa-applications/customer/:customerId
   * Get all applications for a specific customer
   */
  @Get('customer/:customerId')
  async findByCustomer(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query('search') search?: string,
  ) {
    try {
      return await this.visaApplicationsService.findByCustomer(
        customerId,
        search,
      );
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch customer applications',
      });
    }
  }

  /**
   * GET /visa-applications/track/:applicationNumber
   * Get application by application number (for tracking URL in emails)
   */
  @Get('track/:applicationNumber')
  async getByApplicationNumber(@Param('applicationNumber') applicationNumber: string) {
    try {
      return await this.visaApplicationsService.findByApplicationNumber(applicationNumber);
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch application',
      });
    }
  }

  /**
   * GET /visa-applications
   * Get all visa applications with optional search
   */
  @Get()
  async findAll(@Query('search') search?: string) {
    try {
      return await this.visaApplicationsService.findAll(search);
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch visa applications',
      });
    }
  }

  /**
   * GET /visa-applications/:id
   * Get a single visa application by ID
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.visaApplicationsService.findOne(id);
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch visa application',
      });
    }
  }

  /**
   * PATCH /visa-applications/:id
   * Update a visa application (only in draft status)
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateVisaApplicationDto,
  ) {
    try {
      return await this.visaApplicationsService.update(id, updateDto);
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to update visa application',
      });
    }
  }

  /**
   * PATCH /visa-applications/:id/status
   * Update application status only
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    try {
      return await this.visaApplicationsService.updateStatus(
        id,
        updateStatusDto.status,
      );
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to update application status',
      });
    }
  }

  /**
   * POST /visa-applications/:id/request-resubmission  (✅ Changed from PATCH to POST)
   * Admin requests resubmission - supports both single and multiple requests
   */
  /**
   * POST /visa-applications/:id/resubmission-requests  ✅ Changed URL
   * Admin requests resubmission - supports both single and multiple requests
   */
  @Post(':id/resubmission-requests')  // ✅ Changed from request-resubmission
  async createResubmissionRequests(  // ✅ Renamed method
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      requests: Array<{
        target: 'application' | 'traveler';
        travelerId?: number;
        fieldIds?: number[]; // Existing field IDs from visa product
        newFields?: Array<{ // New custom fields to create for this user only
          fieldType: string;
          question: string;
          placeholder?: string;
          isRequired?: boolean;
          options?: string[];
          allowedFileTypes?: string[];
          maxFileSizeMB?: number;
          minLength?: number;
          maxLength?: number;
        }>;
        note?: string;
      }>;
    }
  ) {
    try {
      return await this.visaApplicationsService.requestResubmission(
        id,
        body.requests
      );
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to request resubmission',
      });
    }
  }

  /**
   * GET /visa-applications/:id/resubmission-requests/active  ✅ Changed URL
   * Get active resubmission requests for an application
   */
  @Get(':id/resubmission-requests/active')  // ✅ Added /active to differentiate from POST
  async getActiveResubmissionRequests(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.visaApplicationsService.getActiveResubmissionRequests(id);
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch resubmission requests',
      });
    }
  }
  /**
   * GET /visa-applications/:id/resubmission-requests
   * Get active resubmission requests for an application
   */
  @Get(':id/resubmission-requests')
  async getResubmissionRequests(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.visaApplicationsService.getActiveResubmissionRequests(id);
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch resubmission requests',
      });
    }
  }
  /**
   * POST /visa-applications/:id/admin-fields
   * Add admin-only custom fields for this application (optionally targeted to a traveler)
   */
  @Post(':id/admin-fields')
  async addAdminFields(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { travelerId?: number; fields: Array<any> },
  ) {
    try {
      return await this.visaApplicationsService.addAdminFields(id, dto);
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to add admin fields',
      });
    }
  }




  /**
   * DELETE /visa-applications/:id/admin-fields/:fieldId
   * Remove an admin-only custom field by its ID (negative ID)
   */
  @Delete(':id/admin-fields/:fieldId')
  async removeAdminField(
    @Param('id', ParseIntPipe) id: number,
    @Param('fieldId', ParseIntPipe) fieldId: number,
  ) {
    try {
      return await this.visaApplicationsService.removeAdminField(id, fieldId);
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to remove admin field',
      });
    }
  }

  /**
   * PATCH /visa-applications/:id/processing
   * Select processing type (Step 4 - CheckoutForm.vue)
   */
  @Patch(':id/processing')
  async selectProcessing(
    @Param('id', ParseIntPipe) id: number,
    @Body() selectProcessingDto: SelectProcessingDto,
  ) {
    try {
      return await this.visaApplicationsService.selectProcessing(
        id,
        selectProcessingDto,
      );
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to select processing type',
      });
    }
  }

  /**
   * POST /visa-applications/:id/submit
   * Submit the application (Step 5 - after payment)
   */
  @Post(':id/submit')
  async submit(
    @Param('id', ParseIntPipe) id: number,
    @Body() submitDto: SubmitApplicationDto,
  ) {
    try {
      return await this.visaApplicationsService.submit(id, submitDto);
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to submit visa application',
      });
    }
  }

  /**
   * DELETE /visa-applications/:id
   * Delete a visa application (only in draft status)
   */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.visaApplicationsService.remove(id);
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to delete visa application',
      });
    }
  }

  /**
   * POST /visa-applications/submit-complete
   * Submit complete application in one request (all steps at once)
   */
  @Post('submit-complete')
  async submitComplete(@Body() submitDto: SubmitCompleteApplicationDto) {
    try {
      return await this.visaApplicationsService.submitComplete(submitDto);
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to submit complete application',
      });
    }
  }

  /**
   * POST /visa-applications/test-send-reminders
   * Manual trigger for testing - runs the reminder scheduler immediately
   * ⚠️ FOR TESTING ONLY - Remove or protect in production
   */
  @Post('test-send-reminders')
  async testSendReminders() {
    try {
      await this.visaApplicationsScheduler.handlePendingApplicationReminders();

      return {
        status: true,
        message: 'Reminder check triggered successfully. Check server logs and database for results.',
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to trigger reminder check',
      });
    }
  }
}
