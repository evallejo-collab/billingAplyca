-- PART 6: Create trigger function for billed_amount
CREATE OR REPLACE FUNCTION update_contract_billed_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.contracts 
    SET billed_amount = COALESCE(billed_amount, 0) + NEW.amount
    WHERE id = NEW.contract_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.contracts 
    SET billed_amount = COALESCE(billed_amount, 0) - OLD.amount
    WHERE id = OLD.contract_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.contracts 
    SET billed_amount = COALESCE(billed_amount, 0) - OLD.amount + NEW.amount
    WHERE id = NEW.contract_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;