-- Migration script to populate customerId in payments table
-- Run this AFTER the application starts successfully with nullable customerId

-- Step 1: Populate customerId from related visa_applications
UPDATE payments p
SET "customerId" = va."customerId"
FROM visa_applications va
WHERE p."applicationId" = va.id
  AND p."customerId" IS NULL;

-- Step 2: Verify all payments have customerId (optional check)
-- SELECT COUNT(*) FROM payments WHERE "customerId" IS NULL;
-- If this returns 0, proceed to Step 3

-- Step 3: Make customerId NOT NULL (uncomment after verifying Step 1)
-- ALTER TABLE payments
-- ALTER COLUMN "customerId" SET NOT NULL;

-- Step 4: Add foreign key constraint (uncomment after Step 3)
-- ALTER TABLE payments
-- ADD CONSTRAINT FK_payments_customer
-- FOREIGN KEY ("customerId") REFERENCES customers(id)
-- ON DELETE CASCADE;

