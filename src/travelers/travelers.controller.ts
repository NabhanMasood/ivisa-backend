import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ParseIntPipe,
    BadRequestException,
  } from '@nestjs/common';
  import { TravelersService } from './travelers.service';
  import { CreateTravelerDto } from './dto/create-traveler.dto';
  import { UpdateTravelerDto } from './dto/update-traveler.dto';
  import { BulkCreateTravelersDto } from './dto/bulk-create-travelers.dto';
  import { UpdatePassportDto } from './dto/update-passport.dto';
  
  @Controller('travelers')
  export class TravelersController {
    constructor(private readonly travelersService: TravelersService) {}
  
    /**
     * POST /travelers
     * Create a single traveler (Step 2 - Personal Info)
     */
    @Post()
    async create(@Body() createDto: CreateTravelerDto) {
      try {
        return await this.travelersService.create(createDto);
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to create traveler',
        });
      }
    }
  
    /**
     * POST /travelers/bulk
     * Create multiple travelers at once
     */
    @Post('bulk')
    async bulkCreate(@Body() bulkDto: BulkCreateTravelersDto) {
      try {
        return await this.travelersService.bulkCreate(bulkDto);
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to create travelers',
        });
      }
    }
  
    /**
     * GET /travelers/application/:applicationId
     * Get all travelers for a specific application
     */
    @Get('application/:applicationId')
    async findByApplication(
      @Param('applicationId', ParseIntPipe) applicationId: number,
    ) {
      try {
        return await this.travelersService.findByApplication(applicationId);
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to fetch travelers',
        });
      }
    }
  
    /**
     * GET /travelers/application/:applicationId/validate-passport
     * Check if all travelers have complete passport information
     */
    @Get('application/:applicationId/validate-passport')
    async validatePassportCompletion(
      @Param('applicationId', ParseIntPipe) applicationId: number,
    ) {
      try {
        return await this.travelersService.validatePassportCompletion(
          applicationId,
        );
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to validate passport completion',
        });
      }
    }
  
    /**
     * GET /travelers/:id
     * Get a single traveler by ID
     */
    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
      try {
        return await this.travelersService.findOne(id);
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to fetch traveler',
        });
      }
    }
  
    /**
     * PATCH /travelers/:id
     * Update traveler personal information
     */
    @Patch(':id')
    async update(
      @Param('id', ParseIntPipe) id: number,
      @Body() updateDto: UpdateTravelerDto,
    ) {
      try {
        return await this.travelersService.update(id, updateDto);
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to update traveler',
        });
      }
    }
  
    /**
     * PATCH /travelers/:id/passport
     * Update traveler passport details (Step 3 - PassportDetailsForm.vue)
     */
    @Patch(':id/passport')
    async updatePassport(
      @Param('id', ParseIntPipe) id: number,
      @Body() updatePassportDto: UpdatePassportDto,
    ) {
      try {
        return await this.travelersService.updatePassport(id, updatePassportDto);
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to update passport details',
        });
      }
    }
  
    /**
     * DELETE /travelers/:id
     * Delete a traveler (only for draft applications)
     */
    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number) {
      try {
        return await this.travelersService.remove(id);
      } catch (error) {
        throw new BadRequestException({
          status: false,
          message: error.message || 'Failed to delete traveler',
        });
      }
    }
  }