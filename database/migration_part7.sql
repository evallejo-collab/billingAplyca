-- PART 7: Create trigger
DROP TRIGGER IF EXISTS trigger_update_billed_amount ON public.payments;
CREATE TRIGGER trigger_update_billed_amount
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_contract_billed_amount();