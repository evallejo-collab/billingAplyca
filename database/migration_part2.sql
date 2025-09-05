-- PART 2: Update constraints and add foreign key
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_status_check 
CHECK (status IN ('active', 'completed', 'cancelled', 'paused', 'pending', 'in_progress'));

-- Add foreign key constraint for contract_id
ALTER TABLE public.projects 
ADD CONSTRAINT fk_projects_contract 
FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;