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
import { diskStorage } from 'multer';
import { extname } from 'path';
import sharp from 'sharp'; // Changed from: import * as sharp from 'sharp'
import { CountriesService } from './countries.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import * as fs from 'fs';
import { memoryStorage } from 'multer';

@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('logo', {
      // storage: diskStorage({
      //   destination: '/tmp/uploads/countries',
      //   filename: (req, file, cb) => {
      //     const randomName = Array(32)
      //       .fill(null)
      //       .map(() => Math.round(Math.random() * 16).toString(16))
      //       .join('');
      //     cb(null, `${randomName}${extname(file.originalname)}`);
      //   },
      // }),
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
  async create(
    @Body() createDto: CreateCountryDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      let logoUrl: string | undefined = undefined; // Fixed type

      if (file) {
        // Resize image to 32x32
        const resizedImagePath = file.path.replace(
          extname(file.path),
          '-32x32' + extname(file.path),
        );
        
        await sharp(file.path)
          .resize(32, 32, {
            fit: 'cover',
            position: 'center',
          })
          .toFile(resizedImagePath);

        // Delete original file
        fs.unlinkSync(file.path);

        logoUrl = `/uploads/countries/${resizedImagePath.split('/').pop()}`; // Fixed type
      }

      const country = await this.countriesService.create({
        ...createDto,
        logoUrl, // Now correctly typed as string | undefined
      });

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
  @UseInterceptors(
    FileInterceptor('logo', {
      // storage: diskStorage({
      //   destination: './tmp/uploads/countries',
      //   filename: (req, file, cb) => {
      //     const randomName = Array(32)
      //       .fill(null)
      //       .map(() => Math.round(Math.random() * 16).toString(16))
      //       .join('');
      //     cb(null, `${randomName}${extname(file.originalname)}`);
      //   },
      // }),
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
        fileSize: 1024 * 1024,
      },
    }),
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCountryDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      let logoUrl = updateDto.logoUrl;

      if (file) {
        const resizedImagePath = file.path.replace(
          extname(file.path),
          '-32x32' + extname(file.path),
        );
        
        await sharp(file.path)
          .resize(32, 32, {
            fit: 'cover',
            position: 'center',
          })
          .toFile(resizedImagePath);

        fs.unlinkSync(file.path);

        logoUrl = `/uploads/countries/${resizedImagePath.split('/').pop()}`;
      }

      const country = await this.countriesService.update(id, {
        ...updateDto,
        logoUrl,
      });

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