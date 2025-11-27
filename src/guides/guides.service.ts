import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Guide } from './entities/guide.entity';
import { CreateGuideDto } from './dto/create-guide.dto';
import { UpdateGuideDto } from './dto/update-guide.dto';

@Injectable()
export class GuidesService {
  constructor(
    @InjectRepository(Guide)
    private guideRepo: Repository<Guide>,
  ) { }

  async create(createDto: CreateGuideDto): Promise<Guide> {
    try {
      // Check if slug already exists
      const existing = await this.guideRepo.findOne({
        where: { slug: createDto.slug },
      });
      if (existing) {
        throw new BadRequestException(
          `Guide with slug "${createDto.slug}" already exists`,
        );
      }

      const guide = this.guideRepo.create({
        ...createDto,
        isPublished: createDto.isPublished ?? true,
        isFeatured: createDto.isFeatured ?? false,
      });
      return await this.guideRepo.save(guide);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error creating guide',
      );
    }
  }

  async findAll(
    category?: string,
    search?: string,
    page?: number,
    limit?: number,
    includeUnpublished?: boolean,
    featuredOnly?: boolean,
  ): Promise<{ guides: any[]; total: number; page: number; limit: number }> {
    try {
      const query = this.guideRepo.createQueryBuilder('guide');

      // Build where conditions
      const conditions: string[] = [];
      const params: any = {};

      // Only filter by published status if not including unpublished
      if (!includeUnpublished) {
        conditions.push('guide.isPublished = :isPublished');
        params.isPublished = true;
      }

      // Filter by featured status
      if (featuredOnly) {
        conditions.push('guide.isFeatured = :isFeatured');
        params.isFeatured = true;
      }

      // Apply conditions
      if (conditions.length > 0) {
        query.where(conditions.join(' AND '), params);
      }

      // Filter by category
      if (category && category !== 'all') {
        query.andWhere('guide.category = :category', { category });
      }

      // Search in title, description, and content
      if (search) {
        query.andWhere(
          '(guide.title ILIKE :search OR guide.description ILIKE :search OR guide.content ILIKE :search)',
          { search: `%${search}%` },
        );
      }

      // Order by most recent first
      query.orderBy('guide.createdAt', 'DESC');

      // Pagination
      const pageNum = page ? parseInt(String(page), 10) : 1;
      const limitNum = limit ? parseInt(String(limit), 10) : 20;
      const skip = (pageNum - 1) * limitNum;

      query.skip(skip).take(limitNum);

      const [guides, total] = await query.getManyAndCount();

      // Format response
      const formattedGuides = guides.map((guide) => ({
        id: guide.id,
        slug: guide.slug,
        title: guide.title,
        description: guide.description,
        category: guide.category,
        featuredImage: guide.featuredImage,
        isPublished: guide.isPublished ?? true, // Default to true if null/undefined
        isFeatured: guide.isFeatured ?? false, // Default to false if null/undefined
        createdAt: guide.createdAt,
        updatedAt: guide.updatedAt,
      }));

      return {
        guides: formattedGuides,
        total,
        page: pageNum,
        limit: limitNum,
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Error fetching guides',
      );
    }
  }

  async findOne(idOrSlug: number | string): Promise<any> {
    try {
      // Determine if it's an ID (number) or slug (string)
      const isNumeric = typeof idOrSlug === 'number' || !isNaN(Number(idOrSlug));

      let guide: Guide | null;
      if (isNumeric) {
        // Fetch by ID (for admin/editing - include unpublished)
        guide = await this.guideRepo.findOne({
          where: { id: Number(idOrSlug) },
        });
      } else {
        // Fetch by slug (for public - only published)
        guide = await this.guideRepo.findOne({
          where: { slug: idOrSlug as string, isPublished: true },
        });
      }

      if (!guide) {
        const identifier = isNumeric ? `ID ${idOrSlug}` : `slug "${idOrSlug}"`;
        throw new NotFoundException(`Guide with ${identifier} not found`);
      }

      // Only increment view count for public slug-based access (not for ID-based admin access)
      if (!isNumeric) {
        guide.viewCount = (guide.viewCount || 0) + 1;
        await this.guideRepo.save(guide);
      }

      // Get related guides if they exist
      let relatedGuides: any[] = [];
      if (guide.relatedGuideIds && guide.relatedGuideIds.length > 0) {
        relatedGuides = await this.guideRepo.find({
          where: { id: In(guide.relatedGuideIds), isPublished: true },
          select: [
            'id',
            'slug',
            'title',
            'description',
            'category',
            'featuredImage',
            'createdAt',
          ],
        });
      }

      // If no related guides specified, get guides from the same category
      if (relatedGuides.length === 0) {
        relatedGuides = await this.guideRepo.find({
          where: {
            category: guide.category,
            isPublished: true,
          },
          select: [
            'id',
            'slug',
            'title',
            'description',
            'category',
            'featuredImage',
            'createdAt',
          ],
          take: 3,
          order: { createdAt: 'DESC' },
        });
        // Exclude current guide
        relatedGuides = relatedGuides.filter((g) => g.id !== guide.id);
      }

      return {
        id: guide.id,
        slug: guide.slug,
        title: guide.title,
        description: guide.description,
        content: guide.content,
        category: guide.category,
        featuredImage: guide.featuredImage,
        viewCount: guide.viewCount,
        isPublished: guide.isPublished ?? true, // Default to true if null/undefined
        isFeatured: guide.isFeatured ?? false, // Default to false if null/undefined
        relatedGuideIds: guide.relatedGuideIds,
        relatedGuides: relatedGuides.map((g) => ({
          id: g.id,
          slug: g.slug,
          title: g.title,
          description: g.description,
          category: g.category,
          featuredImage: g.featuredImage,
          createdAt: g.createdAt,
        })),
        createdAt: guide.createdAt,
        updatedAt: guide.updatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error fetching guide',
      );
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const guides = await this.guideRepo.find({
        where: { isPublished: true },
        select: ['category'],
      });

      // Get unique categories
      const categories = [...new Set(guides.map((g) => g.category))];
      return categories.sort();
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Error fetching categories',
      );
    }
  }

  async update(id: number, updateDto: UpdateGuideDto): Promise<Guide> {
    try {
      const guide = await this.guideRepo.findOne({ where: { id } });
      if (!guide) {
        throw new NotFoundException(`Guide with ID ${id} not found`);
      }

      // Check if slug is being updated and if it already exists
      if (updateDto.slug && updateDto.slug !== guide.slug) {
        const existing = await this.guideRepo.findOne({
          where: { slug: updateDto.slug },
        });
        if (existing) {
          throw new BadRequestException(
            `Guide with slug "${updateDto.slug}" already exists`,
          );
        }
      }

      Object.assign(guide, updateDto);
      return await this.guideRepo.save(guide);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error updating guide',
      );
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const guide = await this.guideRepo.findOne({ where: { id } });
      if (!guide) {
        throw new NotFoundException(`Guide with ID ${id} not found`);
      }
      await this.guideRepo.remove(guide);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error deleting guide',
      );
    }
  }
}

