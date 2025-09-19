-- ================================================
-- DATOS DE PRUEBA PARA COORDINACIÓN DE CAPACIDAD
-- ================================================

-- 1. Primero eliminamos datos quemados existentes
DELETE FROM capacity_assignments;
DELETE FROM team_members;

-- 2. Crear miembros de prueba del equipo
INSERT INTO team_members (id, name, email, role, weekly_capacity, hourly_rate, is_active, department, hire_date, skills, notes) VALUES
-- Development Team
(gen_random_uuid(), 'María García', 'maria.garcia@aplyca.com', 'Senior Developer', 40, 65.00, true, 'Development', '2022-01-15', ARRAY['React', 'Node.js', 'PostgreSQL', 'TypeScript'], 'Especialista en frontend y APIs'),
(gen_random_uuid(), 'Carlos Rodríguez', 'carlos.rodriguez@aplyca.com', 'Tech Lead', 35, 85.00, true, 'Development', '2021-03-20', ARRAY['React', 'Python', 'AWS', 'Docker'], 'Líder técnico con experiencia en arquitectura'),
(gen_random_uuid(), 'Ana López', 'ana.lopez@aplyca.com', 'Developer', 40, 45.00, true, 'Development', '2023-06-10', ARRAY['Vue.js', 'JavaScript', 'CSS', 'HTML'], 'Desarrolladora junior con gran potencial'),
(gen_random_uuid(), 'Diego Martínez', 'diego.martinez@aplyca.com', 'Senior Developer', 40, 70.00, true, 'Development', '2020-11-05', ARRAY['Angular', 'C#', '.NET', 'SQL Server'], 'Especialista en aplicaciones empresariales'),
(gen_random_uuid(), 'Laura Hernández', 'laura.hernandez@aplyca.com', 'Developer', 40, 50.00, true, 'Development', '2023-02-28', ARRAY['React', 'GraphQL', 'MongoDB', 'Express'], 'Enfocada en tecnologías modernas'),

-- Infrastructure Team  
(gen_random_uuid(), 'Javier Sánchez', 'javier.sanchez@aplyca.com', 'DevOps Engineer', 40, 75.00, true, 'Infrastructure', '2021-08-12', ARRAY['AWS', 'Kubernetes', 'Terraform', 'Jenkins'], 'Experto en automatización e infraestructura'),
(gen_random_uuid(), 'Isabel Torres', 'isabel.torres@aplyca.com', 'DevOps Engineer', 35, 68.00, true, 'Infrastructure', '2022-05-18', ARRAY['Azure', 'Docker', 'Ansible', 'Monitoring'], 'Especialista en monitoreo y alertas'),

-- Quality Team
(gen_random_uuid(), 'Roberto Silva', 'roberto.silva@aplyca.com', 'QA Engineer', 40, 55.00, true, 'Quality', '2022-09-07', ARRAY['Selenium', 'Jest', 'Cypress', 'API Testing'], 'Automatización de pruebas y testing'),
(gen_random_uuid(), 'Carmen Vega', 'carmen.vega@aplyca.com', 'QA Lead', 35, 62.00, true, 'Quality', '2021-12-03', ARRAY['Test Strategy', 'Automation', 'Performance Testing'], 'Líder de calidad con enfoque estratégico'),

-- Design Team
(gen_random_uuid(), 'Adriana Morales', 'adriana.morales@aplyca.com', 'UX/UI Designer', 40, 58.00, true, 'Design', '2023-01-25', ARRAY['Figma', 'Adobe XD', 'User Research', 'Prototyping'], 'Diseñadora con enfoque en experiencia de usuario'),

-- Management
(gen_random_uuid(), 'Eduardo Vargas', 'eduardo.vargas@aplyca.com', 'Project Manager', 40, 80.00, true, 'Management', '2020-07-14', ARRAY['Agile', 'Scrum', 'Project Planning', 'Stakeholder Management'], 'Gestión de proyectos y coordinación de equipos');

-- 3. Crear configuraciones por defecto
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

-- 4. Función para obtener una fecha de lunes aleatorio de las próximas 4 semanas
CREATE OR REPLACE FUNCTION get_random_monday() RETURNS DATE AS $$
DECLARE
    current_monday DATE;
    offset_weeks INTEGER;
BEGIN
    -- Encontrar el lunes de esta semana
    current_monday := date_trunc('week', CURRENT_DATE) + INTERVAL '0 days';
    
    -- Seleccionar un offset aleatorio de 0 a 3 semanas
    offset_weeks := floor(random() * 4)::INTEGER;
    
    RETURN current_monday + (offset_weeks * INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql;

-- 5. Crear asignaciones de prueba para diferentes semanas
-- Nota: Necesitamos obtener los IDs reales de proyectos y miembros
DO $$
DECLARE
    member_record RECORD;
    project_record RECORD;
    week_date DATE;
    assignment_hours DECIMAL;
    assignment_types TEXT[] := ARRAY['Compromiso', 'Reserva', 'Disponible'];
    priorities TEXT[] := ARRAY['Alta', 'Media', 'Baja'];
    assignment_count INTEGER := 0;
BEGIN
    -- Crear asignaciones para las próximas 4 semanas
    FOR week_offset IN 0..3 LOOP
        week_date := date_trunc('week', CURRENT_DATE) + (week_offset * INTERVAL '7 days');
        
        -- Para cada miembro activo
        FOR member_record IN 
            SELECT id, name, weekly_capacity FROM team_members WHERE is_active = true
        LOOP
            -- Crear 1-3 asignaciones por miembro por semana
            FOR i IN 1..(1 + floor(random() * 3)::INTEGER) LOOP
                -- Seleccionar un proyecto aleatorio (si existen)
                SELECT id INTO project_record
                FROM projects 
                WHERE status = 'active' 
                ORDER BY random() 
                LIMIT 1;
                
                -- Si hay proyectos disponibles, crear la asignación
                IF project_record IS NOT NULL THEN
                    -- Calcular horas asignadas (entre 5 y 20 horas)
                    assignment_hours := 5 + (random() * 15);
                    
                    -- No exceder la capacidad semanal del miembro
                    IF assignment_hours > member_record.weekly_capacity THEN
                        assignment_hours := member_record.weekly_capacity * 0.8;
                    END IF;
                    
                    -- Crear la asignación
                    INSERT INTO capacity_assignments (
                        project_id,
                        member_id,
                        week_start_date,
                        assigned_hours,
                        assignment_type,
                        priority,
                        is_billable,
                        notes,
                        status
                    ) VALUES (
                        project_record,
                        member_record.id,
                        week_date,
                        assignment_hours,
                        assignment_types[1 + floor(random() * array_length(assignment_types, 1))::INTEGER],
                        priorities[1 + floor(random() * array_length(priorities, 1))::INTEGER],
                        random() > 0.2, -- 80% probabilidad de ser facturable
                        CASE 
                            WHEN random() > 0.7 THEN 'Asignación de prueba generada automáticamente'
                            ELSE NULL
                        END,
                        'Activa'
                    );
                    
                    assignment_count := assignment_count + 1;
                    
                    -- Reducir capacidad disponible
                    member_record.weekly_capacity := member_record.weekly_capacity - assignment_hours;
                    
                    -- Si la capacidad restante es muy baja, pasar al siguiente miembro
                    IF member_record.weekly_capacity < 5 THEN
                        EXIT;
                    END IF;
                END IF;
            END LOOP;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Se crearon % asignaciones de prueba', assignment_count;
END;
$$;

-- 6. Crear algunas asignaciones con sobreasignación para probar alertas
DO $$
DECLARE
    member_record RECORD;
    project_record RECORD;
    week_date DATE;
BEGIN
    week_date := date_trunc('week', CURRENT_DATE);
    
    -- Buscar un miembro para sobreasignar
    SELECT id, weekly_capacity INTO member_record
    FROM team_members 
    WHERE is_active = true 
    ORDER BY random() 
    LIMIT 1;
    
    -- Buscar un proyecto
    SELECT id INTO project_record
    FROM projects 
    WHERE status = 'active' 
    ORDER BY random() 
    LIMIT 1;
    
    -- Crear una asignación que exceda la capacidad
    IF member_record IS NOT NULL AND project_record IS NOT NULL THEN
        INSERT INTO capacity_assignments (
            project_id,
            member_id,
            week_start_date,
            assigned_hours,
            assignment_type,
            priority,
            is_billable,
            notes,
            status
        ) VALUES (
            project_record,
            member_record.id,
            week_date,
            member_record.weekly_capacity * 1.3, -- 130% de capacidad
            'Compromiso',
            'Alta',
            true,
            'Asignación de prueba para generar alerta de sobreasignación',
            'Activa'
        );
        
        RAISE NOTICE 'Se creó una asignación de sobreasignación para pruebas de alertas';
    END IF;
END;
$$;

-- 7. Generar estadísticas de los datos creados
SELECT 
    'Miembros del equipo' as tipo,
    COUNT(*) as cantidad,
    STRING_AGG(DISTINCT department, ', ') as detalles
FROM team_members 
WHERE is_active = true
UNION ALL
SELECT 
    'Asignaciones creadas' as tipo,
    COUNT(*) as cantidad,
    COUNT(DISTINCT week_start_date)::TEXT || ' semanas diferentes' as detalles
FROM capacity_assignments
UNION ALL
SELECT 
    'Proyectos con asignaciones' as tipo,
    COUNT(DISTINCT project_id) as cantidad,
    'Diferentes proyectos asignados' as detalles
FROM capacity_assignments;

-- 8. Mostrar vista previa de asignaciones por semana
SELECT 
    week_start_date,
    COUNT(*) as total_asignaciones,
    SUM(assigned_hours) as horas_totales,
    ROUND(AVG(assigned_hours), 2) as horas_promedio
FROM capacity_assignments
GROUP BY week_start_date
ORDER BY week_start_date;

-- 9. Cleanup: remover función temporal
DROP FUNCTION IF EXISTS get_random_monday();

-- ================================================
-- DATOS DE PRUEBA CREADOS EXITOSAMENTE
-- ================================================

/*
RESUMEN DE DATOS CREADOS:

✅ 11 miembros del equipo distribuidos en 5 departamentos
✅ Configuraciones por defecto del módulo
✅ Asignaciones automáticas para 4 semanas
✅ Asignaciones de prueba con sobreasignación para alertas
✅ Datos realistas con variedad de roles, habilidades y capacidades

Para verificar los datos:
- SELECT * FROM team_members WHERE is_active = true;
- SELECT * FROM capacity_assignments ORDER BY week_start_date, member_id;
- SELECT * FROM capacity_settings;

NOTA: Las asignaciones se crean dinámicamente basadas en los proyectos
existentes en tu base de datos. Si no hay proyectos activos, no se 
crearán asignaciones.
*/