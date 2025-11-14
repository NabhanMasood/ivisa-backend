import {
    IsString,
    IsNotEmpty,
    IsNumber,
    Min,
    IsOptional,
    IsBoolean,
    IsIn,
  } from 'class-validator';
  
  export class CreateProcessingOptionDto {
    @IsString()
    @IsNotEmpty({ message: 'Processing type is required' })
    @IsIn(['standard', 'rush', 'super-rush'], {
      message: 'Type must be standard, rush, or super-rush',
    })
    type: string;
  
    @IsString()
    @IsNotEmpty({ message: 'Name is required' })
    name: string; // "Standard", "Rush", "Super Rush"
  
    @IsString()
    @IsNotEmpty({ message: 'Processing time is required' })
    processingTime: string; // "24 Hour Processing", "4 Hour Processing", etc.
  
    @IsNumber()
    @Min(0, { message: 'Fee must be a positive number' })
    fee: number;
  
    @IsString()
    @IsOptional()
    description?: string;
  
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
  
    @IsNumber()
    @IsOptional()
    displayOrder?: number;
  
    @IsNumber()
    @IsOptional()
    estimatedDays?: number;
  
    @IsNumber()
    @IsOptional()
    estimatedHours?: number;
  
    @IsOptional()
    metadata?: Record<string, any>;
  }