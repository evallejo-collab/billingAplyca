<?php

// Script para actualizar la base de datos con nuevas funcionalidades
// Categorización de horas: Consumo Mensual vs Proyectos Específicos

$dbPath = __DIR__ . '/billing_system.db';

try {
    $pdo = new PDO("sqlite:$dbPath");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "🔄 Actualizando base de datos a versión 2.0...\n";
    echo "=====================================\n\n";

    // Crear tabla de proyectos
    echo "📁 Creando tabla de proyectos...\n";
    $pdo->exec("CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contract_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        estimated_hours DECIMAL(8,2),
        status VARCHAR(20) DEFAULT 'active' CHECK(status IN ('active', 'completed', 'on_hold', 'cancelled')),
        start_date DATE,
        end_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
    )");

    // Crear tabla de categorías de consumo
    echo "📂 Creando tabla de categorías de consumo...\n";
    $pdo->exec("CREATE TABLE IF NOT EXISTS hour_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        color VARCHAR(7) DEFAULT '#3B82F6',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // Insertar categorías por defecto
    echo "📝 Insertando categorías por defecto...\n";
    $pdo->exec("INSERT OR IGNORE INTO hour_categories (id, name, description, color) VALUES 
        (1, 'Consumo Mensual', 'Horas de trabajo regular mensual', '#10B981'),
        (2, 'Proyecto Específico', 'Horas dedicadas a proyectos particulares', '#3B82F6'),
        (3, 'Soporte Técnico', 'Horas de soporte y mantenimiento', '#F59E0B'),
        (4, 'Consultoría', 'Horas de asesoramiento y consultoría', '#8B5CF6'),
        (5, 'Emergencia', 'Horas de atención urgente', '#EF4444')");

    // Agregar columnas a time_entries para categorización
    echo "🔧 Actualizando tabla time_entries...\n";
    
    // Verificar si las columnas ya existen
    $columns = $pdo->query("PRAGMA table_info(time_entries)")->fetchAll(PDO::FETCH_ASSOC);
    $existingColumns = array_column($columns, 'name');
    
    if (!in_array('category_id', $existingColumns)) {
        $pdo->exec("ALTER TABLE time_entries ADD COLUMN category_id INTEGER DEFAULT 1 REFERENCES hour_categories(id)");
    }
    
    if (!in_array('project_id', $existingColumns)) {
        $pdo->exec("ALTER TABLE time_entries ADD COLUMN project_id INTEGER NULL REFERENCES projects(id)");
    }
    
    if (!in_array('month_year', $existingColumns)) {
        $pdo->exec("ALTER TABLE time_entries ADD COLUMN month_year VARCHAR(7) NULL");
    }

    // Actualizar datos existentes con la categoría por defecto
    echo "📊 Actualizando datos existentes...\n";
    $pdo->exec("UPDATE time_entries SET category_id = 1 WHERE category_id IS NULL");
    $pdo->exec("UPDATE time_entries SET month_year = strftime('%Y-%m', entry_date) WHERE month_year IS NULL");

    // Crear índices para mejor rendimiento
    echo "⚡ Creando índices optimizados...\n";
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_time_entries_category ON time_entries(category_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_time_entries_month_year ON time_entries(month_year)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_projects_contract ON projects(contract_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)");

    // Insertar algunos proyectos de ejemplo
    echo "🚀 Insertando proyectos de ejemplo...\n";
    $pdo->exec("INSERT OR IGNORE INTO projects (contract_id, name, description, estimated_hours, start_date) VALUES 
        (1, 'Módulo de Reportes', 'Desarrollo del sistema de reportes avanzados', 40.0, '2024-01-20'),
        (1, 'Integración API', 'Integración con APIs de terceros', 25.0, '2024-02-01'),
        (2, 'Migración de Datos', 'Migración del sistema legacy', 30.0, '2024-02-15'),
        (4, 'App Mobile', 'Desarrollo de aplicación móvil complementaria', 80.0, '2024-03-10')");

    // Actualizar algunas entradas existentes con proyectos
    echo "🔄 Asignando entradas existentes a proyectos...\n";
    $pdo->exec("UPDATE time_entries SET project_id = 1, category_id = 2 WHERE id IN (1, 2)");
    $pdo->exec("UPDATE time_entries SET project_id = 2, category_id = 2 WHERE id = 3");
    $pdo->exec("UPDATE time_entries SET project_id = 4, category_id = 2 WHERE id IN (8, 9)");

    echo "✅ Actualización completada exitosamente!\n\n";

    // Mostrar estadísticas actualizadas
    echo "📈 Estadísticas Actualizadas:\n";
    echo "============================\n";
    
    $stats = [
        'Contratos' => $pdo->query("SELECT COUNT(*) FROM contracts")->fetchColumn(),
        'Proyectos' => $pdo->query("SELECT COUNT(*) FROM projects")->fetchColumn(),
        'Categorías' => $pdo->query("SELECT COUNT(*) FROM hour_categories")->fetchColumn(),
        'Entradas de Tiempo' => $pdo->query("SELECT COUNT(*) FROM time_entries")->fetchColumn(),
    ];
    
    foreach ($stats as $label => $count) {
        echo "- {$label}: {$count}\n";
    }
    
    echo "\n📊 Resumen por Categorías:\n";
    $categoryStats = $pdo->query("
        SELECT 
            hc.name,
            COUNT(te.id) as entries,
            COALESCE(SUM(te.hours_used), 0) as total_hours,
            hc.color
        FROM hour_categories hc
        LEFT JOIN time_entries te ON hc.id = te.category_id
        GROUP BY hc.id, hc.name
        ORDER BY total_hours DESC
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($categoryStats as $cat) {
        echo "- {$cat['name']}: {$cat['entries']} entradas, {$cat['total_hours']}h\n";
    }
    
    echo "\n🚀 Sistema actualizado con éxito!\n";
    echo "Nuevas funcionalidades disponibles:\n";
    echo "- ✅ Categorización de horas por tipo de trabajo\n";
    echo "- ✅ Gestión de proyectos específicos\n";
    echo "- ✅ Tracking de consumo mensual vs proyectos\n";
    echo "- ✅ Reportes detallados por categoría\n";

} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}