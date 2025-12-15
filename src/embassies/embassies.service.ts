import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Embassy } from './entities/embassy.entity';
import { CreateEmbassyDto } from './dto/create-embassy.dto';
import { UpdateEmbassyDto } from './dto/update-embassy.dto';
import { VisaApplication } from '../visa-applications/entities/visa-application.entity';

@Injectable()
export class EmbassiesService {
  constructor(
    @InjectRepository(Embassy)
    private embassyRepo: Repository<Embassy>,
    @InjectRepository(VisaApplication)
    private applicationRepo: Repository<VisaApplication>,
  ) {}

  async create(createDto: CreateEmbassyDto): Promise<Embassy> {
    try {
      const embassy = this.embassyRepo.create(createDto);
      return this.embassyRepo.save(embassy);
    } catch (error) {
      throw new BadRequestException(error.message || 'Error creating embassy');
    }
  }

  async findAll(search?: string): Promise<any[]> {
    const query = this.embassyRepo.createQueryBuilder('embassy');

    if (search) {
      query.where(
        '(embassy.destinationCountry ILIKE :search OR embassy.originCountry ILIKE :search OR embassy.embassyName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const embassies = await query.getMany();

    // Group by destination country and count origin countries
    const grouped = embassies.reduce((acc, embassy) => {
      const dest = embassy.destinationCountry;
      if (!acc[dest]) {
        acc[dest] = new Set();
      }
      acc[dest].add(embassy.originCountry);
      return acc;
    }, {} as Record<string, Set<string>>);

    // Convert to array format
    return Object.entries(grouped).map(([destinationCountry, originCountries]) => ({
      destinationCountry,
      originCountriesCount: originCountries.size,
    }));
  }

  async findByDestination(destinationCountry: string, search?: string): Promise<any[]> {
    const query = this.embassyRepo.createQueryBuilder('embassy').where(
      'LOWER(embassy.destinationCountry) = LOWER(:destinationCountry)',
      { destinationCountry },
    );

    if (search) {
      query.andWhere(
        '(embassy.originCountry ILIKE :search OR embassy.embassyName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const embassies = await query.getMany();

    // Group by origin country and count embassies
    const grouped = embassies.reduce((acc, embassy) => {
      const origin = embassy.originCountry;
      if (!acc[origin]) {
        acc[origin] = [];
      }
      acc[origin].push(embassy);
      return acc;
    }, {} as Record<string, Embassy[]>);

    // Convert to array format with counts
    return Object.entries(grouped).map(([originCountry, embassyList]) => ({
      originCountry,
      embassiesCount: embassyList.length,
    }));
  }

  async findByDestinationAndOrigin(
    destinationCountry: string,
    originCountry: string,
    search?: string,
  ): Promise<any[]> {
    const query = this.embassyRepo
      .createQueryBuilder('embassy')
      .where('LOWER(embassy.destinationCountry) = LOWER(:destinationCountry)', { destinationCountry })
      .andWhere('LOWER(embassy.originCountry) = LOWER(:originCountry)', { originCountry });

    if (search) {
      query.andWhere(
        '(embassy.embassyName ILIKE :search OR embassy.address ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const embassies = await query.getMany();

    return embassies.map((embassy) => ({
      id: embassy.id,
      embassyName: embassy.embassyName,
      location: embassy.address,
      destinationCountry: embassy.destinationCountry,
      originCountry: embassy.originCountry,
      createdAt: embassy.createdAt.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      updatedAt: embassy.updatedAt.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
    }));
  }

  async findOne(id: number): Promise<any> {
    try {
      const embassy = await this.embassyRepo.findOne({ where: { id } });
      if (!embassy) {
        throw new NotFoundException(`Embassy with ID ${id} not found`);
      }
      return {
        id: embassy.id,
        destinationCountry: embassy.destinationCountry,
        originCountry: embassy.originCountry,
        embassyName: embassy.embassyName,
        address: embassy.address,
        createdAt: embassy.createdAt.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        updatedAt: embassy.updatedAt.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Error fetching embassy');
    }
  }

  async update(id: number, updateDto: UpdateEmbassyDto): Promise<Embassy> {
    try {
      const embassy = await this.embassyRepo.findOne({ where: { id } });
      if (!embassy) {
        throw new NotFoundException(`Embassy with ID ${id} not found`);
      }

      Object.assign(embassy, updateDto);
      return this.embassyRepo.save(embassy);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Error updating embassy');
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const embassy = await this.embassyRepo.findOne({ where: { id } });
      if (!embassy) {
        throw new NotFoundException(`Embassy with ID ${id} not found`);
      }

      // Check if there are any applications using this embassy
      const applicationsCount = await this.applicationRepo.count({
        where: { embassyId: id },
      });

      if (applicationsCount > 0) {
        throw new BadRequestException(
          `Cannot delete embassy. There are ${applicationsCount} application(s) using this embassy. Please remove or reassign these applications first.`,
        );
      }

      await this.embassyRepo.remove(embassy);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Error deleting embassy');
    }
  }
}

