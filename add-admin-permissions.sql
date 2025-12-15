-- Migration script to add role and permissions columns to auth table

-- Add role column with default value 'superadmin'
ALTER TABLE auth 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'superadmin';

-- Add permissions column as JSONB
ALTER TABLE auth 
ADD COLUMN IF NOT EXISTS permissions JSONB;

-- Update existing admins to have superadmin role
UPDATE auth 
SET role = 'superadmin' 
WHERE role IS NULL;

-- Add comment to columns
COMMENT ON COLUMN auth.role IS 'Admin role: superadmin or subadmin';
COMMENT ON COLUMN auth.permissions IS 'JSON object containing permissions for each module';

-- Example of permissions structure:
-- {
--   "countries": true,
--   "visaProducts": true,
--   "nationalities": true,
--   "embassies": true,
--   "coupons": true,
--   "additionalInfo": true,
--   "customers": true,
--   "applications": true,
--   "finances": true
-- }

