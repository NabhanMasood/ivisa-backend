import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  BadRequestException,
  NotFoundException,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { GuidesService } from './guides.service';
import { CreateGuideDto } from './dto/create-guide.dto';
import { UpdateGuideDto } from './dto/update-guide.dto';
import { CloudinaryService } from '../common/cloudinary.service';

@Controller('guides')
export class GuidesController {
  constructor(
    private readonly guidesService: GuidesService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  @Post()
  async create(@Body() createDto: CreateGuideDto) {
    try {
      const guide = await this.guidesService.create(createDto);
      return {
        status: true,
        message: 'Guide created successfully',
        data: guide,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to create guide',
      });
    }
  }

  @Get()
  async findAll(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('includeUnpublished') includeUnpublished?: string,
    @Query('featuredOnly') featuredOnly?: string,
  ) {
    try {
      const result = await this.guidesService.findAll(
        category,
        search,
        page,
        limit,
        includeUnpublished === 'true',
        featuredOnly === 'true',
      );
      return {
        status: true,
        message: 'Guides retrieved successfully',
        data: result.guides,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch guides',
      });
    }
  }

  @Get('categories')
  async getCategories() {
    try {
      const categories = await this.guidesService.getCategories();
      return {
        status: true,
        message: 'Categories retrieved successfully',
        data: categories,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch categories',
      });
    }
  }

  /**
   * Upload guide image endpoint
   * Uploads to Cloudinary and returns the URL
   * Matches the format expected by the frontend
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        // Log for debugging
        console.log('📤 File upload attempt:', {
          fieldname: file.fieldname,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        });

        if (!file.mimetype.startsWith('image/')) {
          return cb(
            new HttpException(
              'File must be an image',
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  )
  async uploadGuideImage(@UploadedFile() file: Express.Multer.File) {
    // Log request details for debugging
    console.log('📥 Upload request received:', {
      hasFile: !!file,
      fileName: file?.originalname,
      fileSize: file?.size,
      mimeType: file?.mimetype,
    });

    if (!file) {
      throw new BadRequestException({
        status: false,
        message: 'No file provided',
      });
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException({
        status: false,
        message: 'File must be an image',
      });
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException({
        status: false,
        message: 'File size must be less than 5MB',
      });
    }

    try {
      // Upload to Cloudinary
      const uploadResult = await this.cloudinaryService.uploadFile(
        file,
        'ivisa123/guides',
        {
          quality: 90,
        },
      );

      console.log('✅ Image uploaded successfully:', uploadResult.url);

      return {
        status: true,
        message: 'Image uploaded successfully',
        data: {
          imageUrl: uploadResult.url,
          url: uploadResult.url,
          cloudinaryUrl: uploadResult.url,
          fileName: file.originalname,
          fileSize: uploadResult.bytes,
        },
      };
    } catch (error) {
      console.error('❌ Upload error:', error);
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to upload image',
      });
    }
  }

  /**
   * Alternative endpoint for featured image upload (for explicit usage)
   */
  @Post('upload-featured-image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(
            new HttpException(
              'File must be an image',
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit for featured images
      },
    }),
  )
  async uploadFeaturedImageAlt(@UploadedFile() file: Express.Multer.File) {
    // Reuse the same logic
    return this.uploadGuideImage(file);
  }

  /**
   * Upload inline image endpoint
   * For images that will be embedded in the guide content
   * Uploads to Cloudinary and returns the URL to embed in HTML
   */
  @Post('upload-inline-image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
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
        fileSize: 5 * 1024 * 1024, // 5MB limit for inline images
      },
    }),
  )
  async uploadInlineImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    try {
      // Upload to Cloudinary (no resizing, keep original quality for inline images)
      const uploadResult = await this.cloudinaryService.uploadFile(
        file,
        'ivisa123/guides/inline',
        {
          quality: 90,
        },
      );

      return {
        status: true,
        message: 'Inline image uploaded successfully',
        data: {
          imageUrl: uploadResult.url,
          fileName: file.originalname,
          fileSize: uploadResult.bytes,
        },
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to upload inline image',
      });
    }
  }

  @Get(':idOrSlug')
  async findOne(@Param('idOrSlug') idOrSlug: string) {
    try {
      // Try to parse as number (ID), otherwise treat as slug
      const parsedId = parseInt(idOrSlug, 10);
      const identifier = !isNaN(parsedId) ? parsedId : idOrSlug;

      const guide = await this.guidesService.findOne(identifier);
      return {
        status: true,
        message: 'Guide retrieved successfully',
        data: guide,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException({
          status: false,
          message: error.message || 'Guide not found',
        });
      }
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch guide',
      });
    }
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateGuideDto,
  ) {
    try {
      const guide = await this.guidesService.update(id, updateDto);
      return {
        status: true,
        message: 'Guide updated successfully',
        data: guide,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException({
          status: false,
          message: error.message || 'Guide not found',
        });
      }
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to update guide',
      });
    }
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.guidesService.remove(id);
      return {
        status: true,
        message: 'Guide deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException({
          status: false,
          message: error.message || 'Guide not found',
        });
      }
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to delete guide',
      });
    }
  }
}

