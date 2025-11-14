import {
    IsString,
    IsNumber,
    Min,
    IsOptional,
    IsBoolean,
    IsIn,
  } from 'class-validator';
  
  export class UpdateProcessingOptionDto {
    @IsString()
    @IsOptional()
    @IsIn(['standard', 'rush', 'super-rush'], {
      message: 'Type must be standard, rush, or super-rush',
    })
    type?: string;
  
    @IsString()
    @IsOptional()
    name?: string;
  
    @IsString()
    @IsOptional()
    processingTime?: string;
  
    @IsNumber()
    @Min(0)
    @IsOptional()
    fee?: number;
  
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