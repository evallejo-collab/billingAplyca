-- Sistema de Facturación - Schema para Supabase (PostgreSQL)

-- Configurar RLS (Row Level Security)
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Tabla de Usuarios (usando auth.users de Supabase)
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    username TEXT UNIQUE,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (id)
);

-- Tabla de Clientes
CREATE TABLE public.clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de Proyectos
CREATE TABLE public.projects (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'paused')),
    project_type VARCHAR(50) DEFAULT 'development',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de Contratos
CREATE TABLE public.contracts (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES public.projects(id) ON DELETE SET NULL,
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    total_hours DECIMAL(8,2) NOT NULL,
    hourly_rate DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_hours * hourly_rate) STORED,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de Entradas de Tiempo
CREATE TABLE public.time_entries (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES public.projects(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    hours_used DECIMAL(8,2) NOT NULL,
    entry_date DATE NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de Pagos
CREATE TABLE public.payments (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES public.projects(id) ON DELETE SET NULL,
    payment_type VARCHAR(50) DEFAULT 'project_scope' CHECK (payment_type IN ('project_scope', 'recurring_support', 'support_evolutive')),
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    billing_month VARCHAR(7), -- Format: YYYY-MM for monthly billing
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Vista para resumen de contratos
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
    (COALESCE(SUM(te.hours_used), 0) * c.hourly_rate) as billed_amount,
    ((c.total_hours - COALESCE(SUM(te.hours_used), 0)) * c.hourly_rate) as remaining_amount,
    c.status,
    c.start_date,
    c.end_date,
    p.name as project_name
FROM public.contracts c
JOIN public.clients cl ON c.client_id = cl.id
LEFT JOIN public.projects p ON c.project_id = p.id
LEFT JOIN public.time_entries te ON c.id = te.contract_id
GROUP BY c.id, cl.name, p.name;

-- Políticas de RLS (Row Level Security)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Políticas para tablas principales (solo usuarios autenticados)
CREATE POLICY "Authenticated users can view clients" ON public.clients
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert clients" ON public.clients
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update clients" ON public.clients
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete clients" ON public.clients
    FOR DELETE USING (auth.role() = 'authenticated');

-- Replicar políticas similares para todas las tablas
CREATE POLICY "Authenticated users can manage projects" ON public.projects
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage contracts" ON public.contracts
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage time_entries" ON public.time_entries
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage payments" ON public.payments
    FOR ALL USING (auth.role() = 'authenticated');

-- Índices para mejorar rendimiento
CREATE INDEX idx_contracts_client_id ON public.contracts(client_id);
CREATE INDEX idx_contracts_status ON public.contracts(status);
CREATE INDEX idx_contracts_project_id ON public.contracts(project_id);
CREATE INDEX idx_time_entries_contract_id ON public.time_entries(contract_id);
CREATE INDEX idx_time_entries_project_id ON public.time_entries(project_id);
CREATE INDEX idx_time_entries_date ON public.time_entries(entry_date);
CREATE INDEX idx_payments_contract_id ON public.payments(contract_id);
CREATE INDEX idx_payments_project_id ON public.payments(project_id);
CREATE INDEX idx_payments_billing_month ON public.payments(billing_month);
CREATE INDEX idx_projects_client_id ON public.projects(client_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.contracts
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();