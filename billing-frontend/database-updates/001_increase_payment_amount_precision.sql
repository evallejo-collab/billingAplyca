-- Migration: Increase payment amount field precision
-- Date: 2025-09-08
-- Description: Update payments table amount field from NUMERIC(10,2) to NUMERIC(15,2) 
--              to support larger payment amounts (up to 999,999,999,999.99)

-- Check current data to ensure no data loss
SELECT 
    id, 
    amount,
    payment_type,
    payment_date,
    description
FROM payments 
WHERE amount > 99999999.99 
ORDER BY amount DESC;

-- Update the column definition
ALTER TABLE payments 
ALTER COLUMN amount TYPE NUMERIC(15,2);

-- Verify the change was successful
SELECT 
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'payments' AND column_name = 'amount';

-- Test with a large value (optional - you can comment this out if not needed)
-- INSERT INTO payments (amount, payment_type, payment_date, description) 
-- VALUES (117000000.00, 'test', CURRENT_DATE, 'Test large amount - DELETE THIS ROW');

-- Show some sample data to verify precision
SELECT 
    id,
    amount,
    payment_type,
    payment_date,
    description,
    created_at
FROM payments 
ORDER BY created_at DESC 
LIMIT 5;