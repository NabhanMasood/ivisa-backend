import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  IsObject,
} from 'class-validator';

export class CreateGuideDto {
  @IsString()
  @IsNotEmpty({ message: 'Slug is required' })
  slug: string;

  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty({ message: 'Content is required' })
  content: string;

  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  category: string;

  @IsString()
  @IsOptional()
  featuredImage?: string; // Cloudinary URL

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  relatedGuideIds?: number[];
}

