-- PART 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_is_independent ON public.projects(is_independent);
CREATE INDEX IF NOT EXISTS idx_projects_contract_id ON public.projects(contract_id);
CREATE INDEX IF NOT EXISTS idx_clients_company ON public.clients(company) WHERE company IS NOT NULL;