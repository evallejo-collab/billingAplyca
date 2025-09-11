-- Add equivalent_hours field to payments table for fixed support payments
-- This allows manual entry of equivalent hours for fixed support that should be deducted from contract total

ALTER TABLE payments 
ADD COLUMN equivalent_hours NUMERIC(10,2) DEFAULT NULL;

-- Add comment to explain the field
COMMENT ON COLUMN payments.equivalent_hours IS 'Manual equivalent hours for fixed support payments to be deducted from contract total hours';

-- Update existing fixed support payments to have equivalent_hours if needed
-- (You can manually set these values based on your business logic)
-- Example:
-- UPDATE payments 
-- SET equivalent_hours = 40.0 
-- WHERE payment_type = 'fixed' AND billing_month = '2024-01';