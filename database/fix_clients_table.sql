-- Add missing client fields that the frontend expects

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS company VARCHAR(255),
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255),
ADD COLUMN IF NOT EXISTS website VARCHAR(255),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for company search
CREATE INDEX IF NOT EXISTS idx_clients_company ON public.clients(company) WHERE company IS NOT NULL;