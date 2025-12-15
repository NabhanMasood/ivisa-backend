import {
    Injectable,
    NotFoundException,
    BadRequestException,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { ProcessingOption } from './entities/processing-option.entity';
  import { CreateProcessingOptionDto } from './dto/create-processing-option.dto';
  import { UpdateProcessingOptionDto } from './dto/update-processing-option.dto';
  
  @Injectable()
  export class ProcessingOptionsService {
    constructor(
      @InjectRepository(ProcessingOption)
      private processingOptionRepo: Repository<ProcessingOption>,
    ) {}
  
    /**
     * Create a new processing option (Admin only)
     */
    async create(createDto: CreateProcessingOptionDto) {
      try {
        // Check if type already exists
        const existing = await this.processingOptionRepo.findOne({
          where: { type: createDto.type },
        });
  
        if (existing) {
          throw new BadRequestException(
            `Processing option with type '${createDto.type}' already exists`,
          );
        }
  
        const option = this.processingOptionRepo.create(createDto);
        const result = await this.processingOptionRepo.save(option);
  
        return {
          status: true,
          message: 'Processing option created successfully',
          data: result,
        };
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException(
          error.message || 'Error creating processing option',
        );
      }
    }
  
    /**
     * Get all processing options
     * Public endpoint - used by frontend to display options
     */
    async findAll(includeInactive = false) {
      try {
        const query = this.processingOptionRepo.createQueryBuilder('option');
  
        if (!includeInactive) {
          query.where('option.isActive = :isActive', { isActive: true });
        }
  
        const options = await query
          .orderBy('option.displayOrder', 'ASC')
          .addOrderBy('option.fee', 'ASC')
          .getMany();
  
        return {
          status: true,
          message: 'Processing options retrieved successfully',
          count: options.length,
          data: options.map((opt) => ({
            id: opt.id,
            type: opt.type,
            name: opt.name,
            processingTime: opt.processingTime,
            fee: parseFloat(opt.fee.toString()),
            description: opt.description,
            displayOrder: opt.displayOrder,
            estimatedDays: opt.estimatedDays,
            estimatedHours: opt.estimatedHours,
          })),
        };
      } catch (error) {
        throw new BadRequestException(
          error.message || 'Error fetching processing options',
        );
      }
    }
  
    /**
     * Get active processing options only (for frontend)
     */
    async findActive() {
      return this.findAll(false);
    }
  
    /**
     * Get a single processing option by ID
     */
    async findOne(id: number) {
      try {
        const option = await this.processingOptionRepo.findOne({
          where: { id },
        });
  
        if (!option) {
          throw new NotFoundException(
            `Processing option with ID ${id} not found`,
          );
        }
  
        return {
          status: true,
          message: 'Processing option retrieved successfully',
          data: option,
        };
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw error;
        }
        throw new BadRequestException(
          error.message || 'Error fetching processing option',
        );
      }
    }
  
    /**
     * Get processing option by type (standard, rush, super-rush)
     */
    async findByType(type: string) {
      try {
        const option = await this.processingOptionRepo.findOne({
          where: { type },
        });
  
        if (!option) {
          throw new NotFoundException(
            `Processing option with type '${type}' not found`,
          );
        }
  
        return {
          status: true,
          message: 'Processing option retrieved successfully',
          data: {
            id: option.id,
            type: option.type,
            name: option.name,
            processingTime: option.processingTime,
            fee: parseFloat(option.fee.toString()),
            description: option.description,
            estimatedDays: option.estimatedDays,
            estimatedHours: option.estimatedHours,
            isActive: option.isActive,
          },
        };
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw error;
        }
        throw new BadRequestException(
          error.message || 'Error fetching processing option',
        );
      }
    }
  
    /**
     * Update a processing option (Admin only)
     */
    async update(id: number, updateDto: UpdateProcessingOptionDto) {
      try {
        const option = await this.processingOptionRepo.findOne({
          where: { id },
        });
  
        if (!option) {
          throw new NotFoundException(
            `Processing option with ID ${id} not found`,
          );
        }
  
        // If updating type, check it doesn't conflict with existing
        if (updateDto.type && updateDto.type !== option.type) {
          const existing = await this.processingOptionRepo.findOne({
            where: { type: updateDto.type },
          });
          if (existing) {
            throw new BadRequestException(
              `Processing option with type '${updateDto.type}' already exists`,
            );
          }
        }
  
        Object.assign(option, updateDto);
        const result = await this.processingOptionRepo.save(option);
  
        return {
          status: true,
          message: 'Processing option updated successfully',
          data: result,
        };
      } catch (error) {
        if (
          error instanceof NotFoundException ||
          error instanceof BadRequestException
        ) {
          throw error;
        }
        throw new BadRequestException(
          error.message || 'Error updating processing option',
        );
      }
    }
  
    /**
     * Delete a processing option (Admin only)
     */
    async remove(id: number) {
      try {
        const option = await this.processingOptionRepo.findOne({
          where: { id },
        });
  
        if (!option) {
          throw new NotFoundException(
            `Processing option with ID ${id} not found`,
          );
        }
  
        await this.processingOptionRepo.remove(option);
  
        return {
          status: true,
          message: 'Processing option deleted successfully',
        };
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw error;
        }
        throw new BadRequestException(
          error.message || 'Error deleting processing option',
        );
      }
    }
  
    /**
     * Toggle active status (Admin only)
     */
    async toggleActive(id: number) {
      try {
        const option = await this.processingOptionRepo.findOne({
          where: { id },
        });
  
        if (!option) {
          throw new NotFoundException(
            `Processing option with ID ${id} not found`,
          );
        }
  
        option.isActive = !option.isActive;
        const result = await this.processingOptionRepo.save(option);
  
        return {
          status: true,
          message: `Processing option ${result.isActive ? 'activated' : 'deactivated'} successfully`,
          data: {
            id: result.id,
            type: result.type,
            isActive: result.isActive,
          },
        };
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw error;
        }
        throw new BadRequestException(
          error.message || 'Error toggling processing option status',
        );
      }
    }
  
    /**
     * Seed default processing options (run once during setup)
     */
    async seedDefaults() {
      try {
        const defaults = [
          {
            type: 'standard',
            name: 'Standard',
            processingTime: '24 Hour Processing',
            fee: 5320,
            description: 'Standard processing within 24 hours',
            displayOrder: 1,
            estimatedDays: 1,
            estimatedHours: 24,
            isActive: true,
          },
          {
            type: 'rush',
            name: 'Rush',
            processingTime: '4 Hour Processing',
            fee: 5320,
            description: 'Rush processing within 4 hours',
            displayOrder: 2,
            estimatedDays: 0,
            estimatedHours: 4,
            isActive: true,
          },
          {
            type: 'super-rush',
            name: 'Super Rush',
            processingTime: '30 Minute Processing',
            fee: 15320,
            description: 'Super rush processing within 30 minutes',
            displayOrder: 3,
            estimatedDays: 0,
            estimatedHours: 0.5,
            isActive: true,
          },
        ];
  
        const created: ProcessingOption[] = [];
        for (const defaultOption of defaults) {
          const existing = await this.processingOptionRepo.findOne({
            where: { type: defaultOption.type },
          });
  
          if (!existing) {
            const option = this.processingOptionRepo.create(defaultOption);
            const result = await this.processingOptionRepo.save(option);
            created.push(result);
          }
        }
  
        return {
          status: true,
          message: `Seeded ${created.length} processing options`,
          data: created,
        };
      } catch (error) {
        throw new BadRequestException(
          error.message || 'Error seeding processing options',
        );
      }
    }
  }