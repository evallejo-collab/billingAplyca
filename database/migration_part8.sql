-- PART 8: Update existing data
UPDATE public.contracts 
SET billed_amount = COALESCE((
  SELECT SUM(amount) 
  FROM public.payments 
  WHERE contract_id = contracts.id
), 0)
WHERE billed_amount IS NULL OR billed_amount = 0;