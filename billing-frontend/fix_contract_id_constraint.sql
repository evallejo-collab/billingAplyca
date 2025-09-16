-- Fix contract_id constraint in payments table
-- Allow NULL values for independent project payments

-- Remove NOT NULL constraint from contract_id column
ALTER TABLE payments 
ALTER COLUMN contract_id DROP NOT NULL;

-- Verify the change
SELECT 
    column_name, 
    is_nullable, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name = 'contract_id';