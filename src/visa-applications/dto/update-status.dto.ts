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
  ])
  status: string;
}

