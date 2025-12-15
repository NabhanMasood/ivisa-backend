-- Migration: Add isFreeVisa column to nationalities table
-- Date: 2024-01-15
-- Description: Adds a boolean field to mark nationality-destination-product combinations as free visas
--              Free visa products will not appear on the client-side application

ALTER TABLE nationalities 
ADD COLUMN IF NOT EXISTS isFreeVisa BOOLEAN DEFAULT FALSE NOT NULL;

-- Add index for better query performance when filtering free visas
CREATE INDEX IF NOT EXISTS idx_nationalities_free_visa 
ON nationalities(isFreeVisa) 
WHERE isFreeVisa = false;

-- Update existing records to ensure they are not marked as free visa (safety measure)
UPDATE nationalities 
SET isFreeVisa = FALSE 
WHERE isFreeVisa IS NULL;

