-- ================================================
-- DESHABILITAR TRIGGER DE ALERTAS TEMPORALMENTE
-- ================================================

-- Opción 1: Deshabilitar el trigger temporalmente
-- (Ejecuta solo una de estas opciones)

-- DESHABILITAR (para pruebas sin alertas)
DROP TRIGGER IF EXISTS capacity_assignment_alerts ON capacity_assignments;

-- Mensaje
SELECT 'Trigger de alertas deshabilitado para pruebas' as status;

-- ================================================
-- PARA REHABILITAR EL TRIGGER DESPUÉS:
-- ================================================

/*
-- REHABILITAR (cuando quieras las alertas de vuelta)
CREATE TRIGGER capacity_assignment_alerts
    AFTER INSERT OR UPDATE ON capacity_assignments
    FOR EACH ROW EXECUTE FUNCTION generate_capacity_alerts();
*/