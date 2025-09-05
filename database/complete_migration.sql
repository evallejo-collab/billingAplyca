-- COMPLETE MIGRATION SCRIPT FOR SUPABASE
-- Execute this script in your Supabase SQL Editor to fix all issues

-- 1. Fix projects table - add missing fields
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_independent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS independent_client_id INTEGER,
ADD COLUMN IF NOT EXISTS client_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS client_email VARCHAR(255), 
ADD COLUMN IF NOT EXISTS client_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS contract_id INTEGER REFERENCES public.contracts(id) ON DELETE SET NULL;

-- Update the status check constraint to include more statuses
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_status_check 
CHECK (status IN ('active', 'completed', 'cancelled', 'paused', 'pending', 'in_progress'));

-- 2. Fix clients table - add missing fields
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS company VARCHAR(255),
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255),
ADD COLUMN IF NOT EXISTS website VARCHAR(255),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_is_independent ON public.projects(is_independent);
CREATE INDEX IF NOT EXISTS idx_projects_contract_id ON public.projects(contract_id);
CREATE INDEX IF NOT EXISTS idx_clients_company ON public.clients(company) WHERE company IS NOT NULL;

-- 4. Update contracts table to include billed_amount for payments tracking
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS billed_amount DECIMAL(12,2) DEFAULT 0;

-- Create a trigger to automatically update billed_amount when payments are added
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

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_update_billed_amount ON public.payments;
CREATE TRIGGER trigger_update_billed_amount
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_contract_billed_amount();

-- 5. Update the contract_summary view to include the new billed_amount column
DROP VIEW IF EXISTS public.contract_summary;
CREATE VIEW public.contract_summary AS
SELECT 
    c.id,
    c.contract_number,
    cl.name as client_name,
    c.description,
    c.total_hours,
    COALESCE(SUM(te.hours_used), 0) as used_hours,
    (c.total_hours - COALESCE(SUM(te.hours_used), 0)) as remaining_hours,
    c.hourly_rate,
    c.total_amount,
    (COALESCE(SUM(te.hours_used), 0) * c.hourly_rate) as hours_billed_amount,
    COALESCE(c.billed_amount, 0) as billed_amount,
    (c.total_amount - COALESCE(c.billed_amount, 0)) as remaining_amount,
    c.status,
    c.start_date,
    c.end_date,
    p.name as project_name,
    c.created_at,
    c.updated_at
FROM public.contracts c
JOIN public.clients cl ON c.client_id = cl.id
LEFT JOIN public.projects p ON c.project_id = p.id
LEFT JOIN public.time_entries te ON c.id = te.contract_id
GROUP BY c.id, cl.name, p.name;

-- 6. Update existing data if needed
UPDATE public.contracts 
SET billed_amount = COALESCE((
  SELECT SUM(amount) 
  FROM public.payments 
  WHERE contract_id = contracts.id
), 0)
WHERE billed_amount IS NULL OR billed_amount = 0;