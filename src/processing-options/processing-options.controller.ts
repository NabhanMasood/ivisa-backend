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
  import { ProcessingOptionsService } from './processing-options.service';
  import { CreateProcessingOptionDto } from './dto/create-processing-option.dto';
  import { UpdateProcessingOptionDto } from './dto/update-processing-option.dto';
  
  @Controller('processing-options')
  export class ProcessingOptionsController {
    constructor(
      private readonly processingOptionsService: ProcessingOptionsService,
    ) {}
  
    /**
     * POST /processing-options
     * Create a new processing option (Admin only)
     */
    @Post()
    async create(@Body() createDto: CreateProcessingOptionDto) {
      try {
        return await this.processingOptionsService.create(createDto);
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to create processing option',
        });
      }
    }
  
    /**
     * POST /processing-options/seed
     * Seed default processing options (Run once during setup)
     */
    @Post('seed')
    async seedDefaults() {
      try {
        return await this.processingOptionsService.seedDefaults();
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to seed processing options',
        });
      }
    }
  
    /**
     * GET /processing-options
     * Get all processing options
     * Query param: ?includeInactive=true (to include inactive options)
     */
    @Get()
    async findAll(@Query('includeInactive') includeInactive?: string) {
      try {
        const include = includeInactive === 'true';
        return await this.processingOptionsService.findAll(include);
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to fetch processing options',
        });
      }
    }
  
    /**
     * GET /processing-options/active
     * Get only active processing options (Public - for frontend)
     */
    @Get('active')
    async findActive() {
      try {
        return await this.processingOptionsService.findActive();
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to fetch active processing options',
        });
      }
    }
  
    /**
     * GET /processing-options/type/:type
     * Get processing option by type (standard, rush, super-rush)
     */
    @Get('type/:type')
    async findByType(@Param('type') type: string) {
      try {
        return await this.processingOptionsService.findByType(type);
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to fetch processing option',
        });
      }
    }
  
    /**
     * GET /processing-options/:id
     * Get a single processing option by ID
     */
    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
      try {
        return await this.processingOptionsService.findOne(id);
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to fetch processing option',
        });
      }
    }
  
    /**
     * PATCH /processing-options/:id
     * Update a processing option (Admin only)
     */
    @Patch(':id')
    async update(
      @Param('id', ParseIntPipe) id: number,
      @Body() updateDto: UpdateProcessingOptionDto,
    ) {
      try {
        return await this.processingOptionsService.update(id, updateDto);
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to update processing option',
        });
      }
    }
  
    /**
     * PATCH /processing-options/:id/toggle
     * Toggle active status (Admin only)
     */
    @Patch(':id/toggle')
    async toggleActive(@Param('id', ParseIntPipe) id: number) {
      try {
        return await this.processingOptionsService.toggleActive(id);
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to toggle processing option status',
        });
      }
    }
  
    /**
     * DELETE /processing-options/:id
     * Delete a processing option (Admin only)
     */
    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number) {
      try {
        return await this.processingOptionsService.remove(id);
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to delete processing option',
        });
      }
    }
  }