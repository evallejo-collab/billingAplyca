-- ================================================
-- COORDINACIÓN DE CAPACIDAD - MÓDULO COMPLETO
-- ================================================

-- Tabla de miembros del equipo
CREATE TABLE IF NOT EXISTS team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    role VARCHAR(50) DEFAULT 'Developer',
    weekly_capacity INTEGER DEFAULT 40, -- Horas semanales disponibles
    hourly_rate DECIMAL(10,2) DEFAULT 0, -- Tarifa por hora opcional
    is_active BOOLEAN DEFAULT true,
    department VARCHAR(50),
    hire_date DATE,
    skills TEXT[], -- Array de habilidades
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de asignaciones de capacidad
CREATE TABLE IF NOT EXISTS capacity_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL, -- Lunes de la semana
    assigned_hours DECIMAL(5,2) NOT NULL CHECK (assigned_hours >= 0),
    assignment_type VARCHAR(20) DEFAULT 'Compromiso' CHECK (assignment_type IN ('Compromiso', 'Reserva', 'Disponible')),
    priority VARCHAR(10) DEFAULT 'Media' CHECK (priority IN ('Alta', 'Media', 'Baja')),
    is_billable BOOLEAN DEFAULT true,
    leader_id UUID REFERENCES team_members(id), -- Líder responsable
    notes TEXT,
    status VARCHAR(20) DEFAULT 'Activa' CHECK (status IN ('Activa', 'Pausada', 'Completada', 'Cancelada')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID, -- user_id quien creó la asignación
    UNIQUE(project_id, member_id, week_start_date) -- Evita duplicados
);

-- Tabla de configuraciones del módulo
CREATE TABLE IF NOT EXISTS capacity_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID
);

-- Tabla de alertas de capacidad
CREATE TABLE IF NOT EXISTS capacity_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL, -- 'OVERALLOCATION', 'UNDERUTILIZATION', 'MISSING_ASSIGNMENT'
    member_id UUID REFERENCES team_members(id),
    project_id INTEGER REFERENCES projects(id),
    week_start_date DATE,
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'INFO' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de plantillas de asignación (para copiar semanas)
CREATE TABLE IF NOT EXISTS assignment_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    description TEXT,
    template_data JSONB NOT NULL, -- JSON con las asignaciones
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ================================================

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_capacity_assignments_week_date ON capacity_assignments(week_start_date);
CREATE INDEX IF NOT EXISTS idx_capacity_assignments_member ON capacity_assignments(member_id);
CREATE INDEX IF NOT EXISTS idx_capacity_assignments_project ON capacity_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_capacity_assignments_member_week ON capacity_assignments(member_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_team_members_active ON team_members(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_capacity_alerts_unresolved ON capacity_alerts(is_resolved, created_at) WHERE is_resolved = false;

-- ================================================
-- FUNCIONES PARA CÁLCULOS AUTOMÁTICOS
-- ================================================

-- Función para calcular utilización de un miembro en una semana
CREATE OR REPLACE FUNCTION calculate_member_utilization(
    p_member_id UUID,
    p_week_start DATE
) RETURNS JSONB AS $$
DECLARE
    v_weekly_capacity INTEGER;
    v_total_assigned DECIMAL(5,2);
    v_utilization_percentage DECIMAL(5,2);
    v_status VARCHAR(20);
BEGIN
    -- Obtener capacidad semanal del miembro
    SELECT weekly_capacity INTO v_weekly_capacity
    FROM team_members 
    WHERE id = p_member_id AND is_active = true;
    
    IF v_weekly_capacity IS NULL THEN
        RETURN jsonb_build_object(
            'error', 'Member not found or inactive',
            'member_id', p_member_id
        );
    END IF;
    
    -- Calcular horas totales asignadas
    SELECT COALESCE(SUM(assigned_hours), 0) INTO v_total_assigned
    FROM capacity_assignments
    WHERE member_id = p_member_id 
    AND week_start_date = p_week_start
    AND status = 'Activa';
    
    -- Calcular porcentaje de utilización
    IF v_weekly_capacity > 0 THEN
        v_utilization_percentage := (v_total_assigned / v_weekly_capacity) * 100;
    ELSE
        v_utilization_percentage := 0;
    END IF;
    
    -- Determinar status basado en utilización
    IF v_utilization_percentage > 100 THEN
        v_status := 'OVERALLOCATED';
    ELSIF v_utilization_percentage >= 80 THEN
        v_status := 'OPTIMAL';
    ELSIF v_utilization_percentage >= 60 THEN
        v_status := 'GOOD';
    ELSE
        v_status := 'UNDERUTILIZED';
    END IF;
    
    RETURN jsonb_build_object(
        'member_id', p_member_id,
        'week_start_date', p_week_start,
        'weekly_capacity', v_weekly_capacity,
        'total_assigned', v_total_assigned,
        'available_hours', v_weekly_capacity - v_total_assigned,
        'utilization_percentage', v_utilization_percentage,
        'status', v_status
    );
END;
$$ LANGUAGE plpgsql;

-- Función para obtener resumen de proyecto por semana
CREATE OR REPLACE FUNCTION get_project_capacity_summary(
    p_project_id INTEGER,
    p_week_start DATE
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_total_hours DECIMAL(5,2);
    v_member_count INTEGER;
    v_project_name VARCHAR(255);
BEGIN
    -- Obtener información del proyecto
    SELECT name INTO v_project_name FROM projects WHERE id = p_project_id;
    
    -- Calcular totales
    SELECT 
        COALESCE(SUM(assigned_hours), 0),
        COUNT(DISTINCT member_id)
    INTO v_total_hours, v_member_count
    FROM capacity_assignments
    WHERE project_id = p_project_id 
    AND week_start_date = p_week_start
    AND status = 'Activa';
    
    RETURN jsonb_build_object(
        'project_id', p_project_id,
        'project_name', v_project_name,
        'week_start_date', p_week_start,
        'total_hours', v_total_hours,
        'member_count', v_member_count
    );
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- TRIGGERS PARA MANTENIMIENTO AUTOMÁTICO
-- ================================================

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a las tablas necesarias
CREATE TRIGGER update_team_members_updated_at 
    BEFORE UPDATE ON team_members 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_capacity_assignments_updated_at 
    BEFORE UPDATE ON capacity_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para generar alertas automáticas
CREATE OR REPLACE FUNCTION generate_capacity_alerts()
RETURNS TRIGGER AS $$
DECLARE
    v_utilization JSONB;
    v_percentage DECIMAL(5,2);
BEGIN
    -- Calcular utilización después del cambio
    v_utilization := calculate_member_utilization(NEW.member_id, NEW.week_start_date);
    v_percentage := (v_utilization->>'utilization_percentage')::DECIMAL(5,2);
    
    -- Generar alerta si sobrepasa 100%
    IF v_percentage > 100 THEN
        INSERT INTO capacity_alerts (
            alert_type, member_id, week_start_date, message, severity
        ) VALUES (
            'OVERALLOCATION',
            NEW.member_id,
            NEW.week_start_date,
            format('Member %s is overallocated at %s%% for week of %s', 
                   (SELECT name FROM team_members WHERE id = NEW.member_id),
                   ROUND(v_percentage, 1)::text,
                   NEW.week_start_date::text),
            CASE 
                WHEN v_percentage > 120 THEN 'CRITICAL'
                WHEN v_percentage > 110 THEN 'HIGH'
                ELSE 'MEDIUM'
            END
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER capacity_assignment_alerts
    AFTER INSERT OR UPDATE ON capacity_assignments
    FOR EACH ROW EXECUTE FUNCTION generate_capacity_alerts();

-- ================================================
-- CONFIGURACIONES INICIALES
-- ================================================

-- Configuraciones iniciales del módulo
INSERT INTO capacity_settings (setting_key, setting_value, description) VALUES
('default_weekly_capacity', '40', 'Capacidad semanal por defecto para nuevos miembros'),
('overallocation_threshold', '100', 'Umbral de sobreasignación (%)'),
('underutilization_threshold', '60', 'Umbral de subutilización (%)'),
('alert_enabled', 'true', 'Activar alertas automáticas'),
('week_start_day', '1', 'Día de inicio de semana (1=Lunes)'),
('assignment_types', '["Compromiso", "Reserva", "Disponible"]', 'Tipos de asignación disponibles'),
('priority_levels', '["Alta", "Media", "Baja"]', 'Niveles de prioridad disponibles')
ON CONFLICT (setting_key) DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = CURRENT_TIMESTAMP;

-- ================================================
-- VISTAS PARA REPORTES COMUNES
-- ================================================

-- Vista de utilización semanal por miembro
CREATE OR REPLACE VIEW weekly_member_utilization AS
SELECT 
    tm.id as member_id,
    tm.name as member_name,
    tm.department,
    tm.weekly_capacity,
    ca.week_start_date,
    COALESCE(SUM(ca.assigned_hours), 0) as total_assigned,
    tm.weekly_capacity - COALESCE(SUM(ca.assigned_hours), 0) as available_hours,
    CASE 
        WHEN tm.weekly_capacity > 0 THEN 
            ROUND((COALESCE(SUM(ca.assigned_hours), 0) / tm.weekly_capacity * 100), 1)
        ELSE 0 
    END as utilization_percentage,
    COUNT(DISTINCT ca.project_id) as project_count
FROM team_members tm
CROSS JOIN (
    SELECT DISTINCT week_start_date 
    FROM capacity_assignments 
    WHERE week_start_date >= CURRENT_DATE - INTERVAL '4 weeks'
) weeks
LEFT JOIN capacity_assignments ca ON tm.id = ca.member_id 
    AND ca.week_start_date = weeks.week_start_date 
    AND ca.status = 'Activa'
WHERE tm.is_active = true
GROUP BY tm.id, tm.name, tm.department, tm.weekly_capacity, ca.week_start_date;

-- Vista de resumen por proyecto
CREATE OR REPLACE VIEW project_capacity_summary AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    c.name as client_name,
    ca.week_start_date,
    COUNT(DISTINCT ca.member_id) as assigned_members,
    SUM(ca.assigned_hours) as total_hours,
    ROUND(AVG(ca.assigned_hours), 1) as avg_hours_per_member,
    COUNT(CASE WHEN ca.priority = 'Alta' THEN 1 END) as high_priority_assignments
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
LEFT JOIN capacity_assignments ca ON p.id = ca.project_id AND ca.status = 'Activa'
WHERE ca.week_start_date IS NOT NULL
GROUP BY p.id, p.name, c.name, ca.week_start_date;

-- ================================================
-- FUNCIONES DE UTILIDAD PARA EL FRONTEND
-- ================================================

-- Función para copiar asignaciones de una semana a otra
CREATE OR REPLACE FUNCTION copy_week_assignments(
    p_source_week DATE,
    p_target_week DATE,
    p_project_ids INTEGER[] DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_copied_count INTEGER := 0;
    v_assignment RECORD;
BEGIN
    FOR v_assignment IN 
        SELECT * FROM capacity_assignments 
        WHERE week_start_date = p_source_week
        AND (p_project_ids IS NULL OR project_id = ANY(p_project_ids))
        AND status = 'Activa'
    LOOP
        INSERT INTO capacity_assignments (
            project_id, member_id, week_start_date, assigned_hours,
            assignment_type, priority, is_billable, leader_id, notes
        ) VALUES (
            v_assignment.project_id,
            v_assignment.member_id,
            p_target_week,
            v_assignment.assigned_hours,
            v_assignment.assignment_type,
            v_assignment.priority,
            v_assignment.is_billable,
            v_assignment.leader_id,
            v_assignment.notes
        ) ON CONFLICT (project_id, member_id, week_start_date) DO NOTHING;
        
        v_copied_count := v_copied_count + 1;
    END LOOP;
    
    RETURN v_copied_count;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- POLÍTICAS DE SEGURIDAD RLS
-- ================================================

-- Habilitar RLS en las nuevas tablas
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacity_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacity_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacity_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_templates ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar según roles de usuario)
CREATE POLICY "Enable read access for authenticated users" ON team_members
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON capacity_assignments
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON capacity_alerts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON capacity_settings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON assignment_templates
    FOR ALL USING (auth.role() = 'authenticated');

-- ================================================
-- COMENTARIOS FINALES
-- ================================================

COMMENT ON TABLE team_members IS 'Miembros del equipo de desarrollo con capacidad semanal';
COMMENT ON TABLE capacity_assignments IS 'Asignaciones de capacidad por proyecto y semana';
COMMENT ON TABLE capacity_alerts IS 'Alertas automáticas sobre problemas de capacidad';
COMMENT ON TABLE capacity_settings IS 'Configuraciones globales del módulo';
COMMENT ON TABLE assignment_templates IS 'Plantillas para copiar asignaciones';

COMMENT ON FUNCTION calculate_member_utilization IS 'Calcula utilización de un miembro en una semana específica';
COMMENT ON FUNCTION get_project_capacity_summary IS 'Obtiene resumen de capacidad asignada a un proyecto';
COMMENT ON FUNCTION copy_week_assignments IS 'Copia asignaciones de una semana a otra';