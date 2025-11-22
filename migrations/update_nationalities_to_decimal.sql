-- Migration: Update nationalities table to support decimal values
-- Run this SQL to alter the column types from integer to decimal

ALTER TABLE nationalities 
  ALTER COLUMN "govtFee" TYPE DECIMAL(10,2) USING "govtFee"::DECIMAL(10,2),
  ALTER COLUMN "serviceFee" TYPE DECIMAL(10,2) USING "serviceFee"::DECIMAL(10,2),
  ALTER COLUMN "totalAmount" TYPE DECIMAL(10,2) USING "totalAmount"::DECIMAL(10,2);

-- Note: If columns are NULL, the USING clause will handle the conversion
-- If you have existing integer values, they will be converted to decimals (e.g., 40 -> 40.00)

