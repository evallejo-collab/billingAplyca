-- PART 4: Add contracts billed_amount column
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS billed_amount DECIMAL(12,2) DEFAULT 0;