import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  BadRequestException,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { EmbassiesService } from './embassies.service';
import { CreateEmbassyDto } from './dto/create-embassy.dto';
import { UpdateEmbassyDto } from './dto/update-embassy.dto';

@Controller('embassies')
export class EmbassiesController {
  constructor(private readonly embassiesService: EmbassiesService) {}

  @Post()
  async create(@Body() createDto: CreateEmbassyDto) {
    try {
      const embassy = await this.embassiesService.create(createDto);
      return {
        status: true,
        message: 'Embassy created successfully',
        data: embassy,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to create embassy',
      });
    }
  }

  @Get()
  async findAll(@Query('search') search: string) {
    try {
      const embassies = await this.embassiesService.findAll(search);
      return {
        status: true,
        message: 'Embassies retrieved successfully',
        count: embassies.length,
        data: embassies,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch embassies',
      });
    }
  }

  @Get('destination/:destinationCountry')
  async findByDestination(
    @Param('destinationCountry') destinationCountry: string,
    @Query('search') search: string,
  ) {
    try {
      const embassies = await this.embassiesService.findByDestination(
        decodeURIComponent(destinationCountry),
        search,
      );
      return {
        status: true,
        message: 'Embassies retrieved successfully',
        count: embassies.length,
        data: embassies,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch embassies',
      });
    }
  }

  @Get('destination/:destinationCountry/origin/:originCountry')
  async findByDestinationAndOrigin(
    @Param('destinationCountry') destinationCountry: string,
    @Param('originCountry') originCountry: string,
    @Query('search') search: string,
  ) {
    try {
      const embassies = await this.embassiesService.findByDestinationAndOrigin(
        decodeURIComponent(destinationCountry),
        decodeURIComponent(originCountry),
        search,
      );
      return {
        status: true,
        message: 'Embassies retrieved successfully',
        count: embassies.length,
        data: embassies,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch embassies',
      });
    }
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const embassy = await this.embassiesService.findOne(id);
      return {
        status: true,
        message: 'Embassy retrieved successfully',
        data: embassy,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch embassy',
      });
    }
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateEmbassyDto) {
    try {
      const embassy = await this.embassiesService.update(id, updateDto);
      return {
        status: true,
        message: 'Embassy updated successfully',
        data: embassy,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to update embassy',
      });
    }
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.embassiesService.remove(id);
      return {
        status: true,
        message: 'Embassy deleted successfully',
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to delete embassy',
      });
    }
  }
}

