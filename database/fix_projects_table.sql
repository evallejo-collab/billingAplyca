-- Alter projects table to add missing fields for the frontend

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

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_projects_is_independent ON public.projects(is_independent);
CREATE INDEX IF NOT EXISTS idx_projects_contract_id ON public.projects(contract_id);