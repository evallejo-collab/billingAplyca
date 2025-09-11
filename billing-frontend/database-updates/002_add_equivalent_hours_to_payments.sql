-- Migration 002: Add equivalent_hours field to payments table
-- Purpose: Track hours equivalent for recurring support payments
-- Date: 2025-09-10

-- Add equivalent_hours column to payments table
ALTER TABLE payments 
ADD COLUMN equivalent_hours DECIMAL(5,2) DEFAULT 0;

-- Add comment to document the purpose
COMMENT ON COLUMN payments.equivalent_hours IS 'Hours equivalent for recurring support payments. Used to calculate total consumed hours for contracts.';

-- Update existing recurring_support payments to have 0 hours initially
-- (can be updated manually later)
UPDATE payments 
SET equivalent_hours = 0 
WHERE payment_type = 'recurring_support' 
AND equivalent_hours IS NULL;

-- Verification query
-- SELECT payment_type, equivalent_hours, amount, payment_date 
-- FROM payments 
-- WHERE payment_type = 'recurring_support' 
-- ORDER BY payment_date DESC 
-- LIMIT 10;