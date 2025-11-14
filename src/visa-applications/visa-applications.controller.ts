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
  import { CreateVisaApplicationDto } from './dto/create-visa-application.dto';
  import { UpdateVisaApplicationDto } from './dto/update-visa-application.dto';
  import { SelectProcessingDto } from './dto/select-processing.dto';
  import { SubmitApplicationDto } from './dto/submit-application.dto';
  import { SubmitCompleteApplicationDto } from './dto/submit-complete-application.dto';
  
  @Controller('visa-applications')
  export class VisaApplicationsController {
    constructor(
      private readonly visaApplicationsService: VisaApplicationsService,
    ) {}
  
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
  }