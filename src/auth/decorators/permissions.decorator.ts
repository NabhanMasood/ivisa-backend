import { SetMetadata } from '@nestjs/common';

export type Permission = 
  | 'countries' 
  | 'visaProducts' 
  | 'nationalities' 
  | 'embassies' 
  | 'coupons' 
  | 'additionalInfo' 
  | 'customers' 
  | 'applications' 
  | 'finances';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: Permission[]) => 
  SetMetadata(PERMISSIONS_KEY, permissions);

