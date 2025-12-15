import { IsOptional, IsString } from 'class-validator';

export class SubmitApplicationDto {
  @IsString()
  @IsOptional()
  notes?: string; // Any final notes before submission

  // Payment will be handled separately in the payments module
  // This DTO is just to mark the application as submitted
}