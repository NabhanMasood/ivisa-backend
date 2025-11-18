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
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CountriesService } from './countries.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { CloudinaryService } from '../common/cloudinary.service';
import sharp from 'sharp';

@Controller('countries')
export class CountriesController {
  constructor(
    private readonly countriesService: CountriesService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  /**
   * Upload logo endpoint - separate from create/update
   * Backend uploads to Cloudinary and returns the URL
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return cb(
            new HttpException(
              'Only image files are allowed!',
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 1024 * 1024, // 1MB limit
      },
    }),
  )
  async uploadLogo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    try {
      // Resize image to 32x32 using sharp
      const resizedBuffer = await sharp(file.buffer)
        .resize(32, 32, {
          fit: 'cover',
          position: 'center',
        })
        .toBuffer();

      // Create a new file object with resized buffer
      const resizedFile: Express.Multer.File = {
        ...file,
        buffer: resizedBuffer,
      };

      // Upload to Cloudinary
      const uploadResult = await this.cloudinaryService.uploadImageWithResize(
        resizedFile,
        'ivisa123/countries',
        32,
        32,
      );

      return {
        status: true,
        message: 'Logo uploaded successfully',
        data: {
          logoUrl: uploadResult.url,
          fileName: file.originalname,
          fileSize: uploadResult.bytes,
        },
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to upload logo',
      });
    }
  }

  @Post()
  async create(@Body() createDto: CreateCountryDto) {
    try {
      const country = await this.countriesService.create(createDto);

      return {
        status: true,
        message: 'Country created successfully',
        data: country,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to create country',
      });
    }
  }

  @Get()
  async findAll(@Query('search') search: string) {
    try {
      const countries = await this.countriesService.findAll(search);
      return {
        status: true,
        message: 'Countries retrieved successfully',
        count: countries.length,
        data: countries,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch countries',
      });
    }
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const country = await this.countriesService.findOne(id);
      return {
        status: true,
        message: 'Country retrieved successfully',
        data: country,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch country',
      });
    }
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCountryDto,
  ) {
    try {
      const country = await this.countriesService.update(id, updateDto);

      return {
        status: true,
        message: 'Country updated successfully',
        data: country,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to update country',
      });
    }
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.countriesService.remove(id);
      return {
        status: true,
        message: 'Country deleted successfully',
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to delete country',
      });
    }
  }
}