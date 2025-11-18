import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Traveler } from './entities/traveler.entity';
import { VisaApplication } from '../visa-applications/entities/visa-application.entity';
import { CreateTravelerDto } from './dto/create-traveler.dto';
import { UpdateTravelerDto } from './dto/update-traveler.dto';
import { BulkCreateTravelersDto } from './dto/bulk-create-travelers.dto';
import { UpdatePassportDto } from './dto/update-passport.dto';

@Injectable()
export class TravelersService {
  constructor(
    @InjectRepository(Traveler)
    private travelerRepo: Repository<Traveler>,
    @InjectRepository(VisaApplication)
    private applicationRepo: Repository<VisaApplication>,
  ) { }

  /**
   * Create a single traveler (Step 2 - Personal Info)
   */
  async create(createDto: CreateTravelerDto) {
    try {
      // Validate application exists
      const application = await this.applicationRepo.findOne({
        where: { id: createDto.applicationId },
        relations: ['travelers'],
      });

      if (!application) {
        throw new NotFoundException(
          `Visa application with ID ${createDto.applicationId} not found`,
        );
      }

      // Check if application is still in draft/submitted status
      if (!['draft', 'submitted'].includes(application.status)) {
        throw new BadRequestException(
          `Cannot add travelers to application with status: ${application.status}`,
        );
      }

      // Check if we've already reached the maximum number of travelers
      const currentTravelerCount = application.travelers?.length || 0;
      if (currentTravelerCount >= application.numberOfTravelers) {
        throw new BadRequestException(
          `Application already has ${application.numberOfTravelers} traveler(s). Cannot add more.`,
        );
      }

      // Create traveler with proper type conversion
      const traveler = this.travelerRepo.create({
        applicationId: createDto.applicationId,
        firstName: createDto.firstName,
        lastName: createDto.lastName,
        email: createDto.email,
        dateOfBirth: new Date(createDto.dateOfBirth),
        passportNationality: createDto.passportNationality,
        passportNumber: createDto.passportNumber,
        passportExpiryDate: createDto.passportExpiryDate
          ? new Date(createDto.passportExpiryDate)
          : undefined,
        residenceCountry: createDto.residenceCountry,
        hasSchengenVisa: createDto.hasSchengenVisa || false,
        placeOfBirth: createDto.placeOfBirth,
        notes: createDto.notes,
      });

      const result = await this.travelerRepo.save(traveler);

      return {
        status: true,
        message: 'Traveler added successfully',
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
        error.message || 'Error creating traveler',
      );
    }
  }

  /**
   * Create multiple travelers at once (Step 2 - Bulk)
   */
  async bulkCreate(bulkDto: BulkCreateTravelersDto) {
    try {
      // Validate application exists
      const application = await this.applicationRepo.findOne({
        where: { id: bulkDto.applicationId },
        relations: ['travelers'],
      });

      if (!application) {
        throw new NotFoundException(
          `Visa application with ID ${bulkDto.applicationId} not found`,
        );
      }
      // Check if application is still in draft/submitted status
      if (!['draft', 'submitted'].includes(application.status)) {
        throw new BadRequestException(
          `Cannot add travelers to application with status: ${application.status}`,
        );
      }
      // Check if the number of travelers matches
      const currentTravelerCount = application.travelers?.length || 0;
      const newTravelerCount = bulkDto.travelers.length;
      const totalCount = currentTravelerCount + newTravelerCount;

      if (totalCount > application.numberOfTravelers) {
        throw new BadRequestException(
          `Total travelers (${totalCount}) exceeds application limit (${application.numberOfTravelers})`,
        );
      }
      if (bulkDto.travelers.length > 0 && !bulkDto.travelers[0].email) {
        throw new BadRequestException(
          'The first traveler must have an email address',
        );
      }
      const travelers = bulkDto.travelers.map((travelerData) => {
        return this.travelerRepo.create({
          applicationId: bulkDto.applicationId,
          firstName: travelerData.firstName,
          lastName: travelerData.lastName,
          email: travelerData.email || undefined, // Change null to undefined
          dateOfBirth: new Date(travelerData.dateOfBirth),
          passportNationality: travelerData.passportNationality,
          passportNumber: travelerData.passportNumber,
          passportExpiryDate: travelerData.passportExpiryDate
            ? new Date(travelerData.passportExpiryDate)
            : undefined,
          residenceCountry: travelerData.residenceCountry,
          hasSchengenVisa: travelerData.hasSchengenVisa || false,
          placeOfBirth: travelerData.placeOfBirth,
          notes: travelerData.notes,
        });
      });
      const result = await this.travelerRepo.save(travelers);
      return {
        status: true,
        message: `${result.length} traveler(s) added successfully`,
        count: result.length,
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
        error.message || 'Error creating travelers',
      );
    }
  }

  /**
   * Get all travelers for a visa application
   */
  async findByApplication(applicationId: number) {
    try {
      const application = await this.applicationRepo.findOne({
        where: { id: applicationId },
      });

      if (!application) {
        throw new NotFoundException(
          `Visa application with ID ${applicationId} not found`,
        );
      }

      const travelers = await this.travelerRepo.find({
        where: { applicationId },
        order: { createdAt: 'ASC' },
      });

      return {
        status: true,
        message: 'Travelers retrieved successfully',
        count: travelers.length,
        data: travelers,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error fetching travelers',
      );
    }
  }

  /**
   * Get a single traveler by ID
   */
  async findOne(id: number) {
    try {
      const traveler = await this.travelerRepo.findOne({
        where: { id },
        relations: ['application'],
      });

      if (!traveler) {
        throw new NotFoundException(`Traveler with ID ${id} not found`);
      }

      return {
        status: true,
        message: 'Traveler retrieved successfully',
        data: traveler,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error fetching traveler',
      );
    }
  }

  /**
   * Update traveler information
   */
  async update(id: number, updateDto: UpdateTravelerDto) {
    try {
      const traveler = await this.travelerRepo.findOne({
        where: { id },
        relations: ['application'],
      });

      if (!traveler) {
        throw new NotFoundException(`Traveler with ID ${id} not found`);
      }

      // Check if application is still editable
      if (
        !['draft', 'submitted', 'processing'].includes(
          traveler.application.status,
        )
      ) {
        throw new BadRequestException(
          `Cannot update traveler for application with status: ${traveler.application.status}`,
        );
      }

      // Update traveler
      Object.assign(traveler, updateDto);

      if (updateDto.dateOfBirth) {
        traveler.dateOfBirth = new Date(updateDto.dateOfBirth);
      }

      if (updateDto.passportExpiryDate) {
        traveler.passportExpiryDate = new Date(updateDto.passportExpiryDate);
      }

      const result = await this.travelerRepo.save(traveler);

      return {
        status: true,
        message: 'Traveler updated successfully',
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
        error.message || 'Error updating traveler',
      );
    }
  }

  /**
   * Update passport details (Step 3 - PassportDetailsForm.vue)
   */
  async updatePassport(id: number, updatePassportDto: UpdatePassportDto) {
    try {
      const traveler = await this.travelerRepo.findOne({
        where: { id },
        relations: ['application'],
      });

      if (!traveler) {
        throw new NotFoundException(`Traveler with ID ${id} not found`);
      }

      // Check if application is still editable
      if (
        !['draft', 'submitted', 'processing'].includes(
          traveler.application.status,
        )
      ) {
        throw new BadRequestException(
          `Cannot update passport details for application with status: ${traveler.application.status}`,
        );
      }

      // Validate passport expiry date is in the future
      const expiryDate = new Date(updatePassportDto.passportExpiryDate);
      if (expiryDate < new Date()) {
        throw new BadRequestException('Passport expiry date must be in the future');
      }

      // Update passport details
      traveler.passportNationality = updatePassportDto.passportNationality;
      traveler.passportNumber = updatePassportDto.passportNumber;
      traveler.passportExpiryDate = expiryDate;
      traveler.residenceCountry = updatePassportDto.residenceCountry;
      traveler.hasSchengenVisa = updatePassportDto.hasSchengenVisa;

      if (updatePassportDto.passportIssuePlace) {
        traveler.passportIssuePlace = updatePassportDto.passportIssuePlace;
      }

      if (updatePassportDto.passportIssueDate) {
        traveler.passportIssueDate = new Date(updatePassportDto.passportIssueDate);
      }

      if (updatePassportDto.placeOfBirth) {
        traveler.placeOfBirth = updatePassportDto.placeOfBirth;
      }

      const result = await this.travelerRepo.save(traveler);

      return {
        status: true,
        message: 'Passport details updated successfully',
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
        error.message || 'Error updating passport details',
      );
    }
  }

  /**
   * Delete a traveler
   */
  async remove(id: number) {
    try {
      const traveler = await this.travelerRepo.findOne({
        where: { id },
        relations: ['application'],
      });

      if (!traveler) {
        throw new NotFoundException(`Traveler with ID ${id} not found`);
      }

      // Only allow deletion if application is in draft status
      if (traveler.application.status !== 'draft') {
        throw new BadRequestException(
          'Can only delete travelers from draft applications',
        );
      }

      await this.travelerRepo.remove(traveler);

      return {
        status: true,
        message: 'Traveler deleted successfully',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error deleting traveler',
      );
    }
  }

  /**
   * Check if all travelers have complete passport information
   */
  async validatePassportCompletion(applicationId: number) {
    try {
      const travelers = await this.travelerRepo.find({
        where: { applicationId },
      });

      if (travelers.length === 0) {
        return {
          status: false,
          message: 'No travelers found for this application',
          data: { isComplete: false, incompleteTravelers: [] },
        };
      }

      const incompleteTravelers = travelers.filter(
        (t) =>
          !t.passportNationality ||
          !t.passportNumber ||
          !t.passportExpiryDate ||
          !t.residenceCountry ||
          t.hasSchengenVisa === null,
      );

      const isComplete = incompleteTravelers.length === 0;

      return {
        status: true,
        message: isComplete
          ? 'All travelers have complete passport information'
          : 'Some travelers have incomplete passport information',
        data: {
          isComplete,
          totalTravelers: travelers.length,
          completeTravelers: travelers.length - incompleteTravelers.length,
          incompleteTravelers: incompleteTravelers.map((t) => ({
            id: t.id,
            name: `${t.firstName} ${t.lastName}`,
          })),
        },
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Error validating passport completion',
      );
    }
  }
}