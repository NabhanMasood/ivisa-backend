import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class UpdateStatusDto {
  @IsString()
  @IsNotEmpty({ message: 'Status is required' })
  @IsIn([
    'draft',
    'submitted',
    'resubmission',
    'Additional Info required',
    'processing',
    'under_review',
    'approved',
    'rejected',
    'cancelled',
    'completed',
    // Kanban column values (will be mapped to actual statuses)
    'pending',
    'in_process',
  ])
  status: string;
}

