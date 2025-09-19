-- ================================================
-- CORRECCIÓN DE FUNCIÓN DE ALERTAS DE CAPACIDAD
-- ================================================

-- Reemplazar la función con el formato correcto
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

-- Mensaje de confirmación
SELECT 'Función de alertas corregida exitosamente' as status;