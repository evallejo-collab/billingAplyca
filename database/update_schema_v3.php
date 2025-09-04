<?php

// Script para actualizar la base de datos a versión 3.0
// Proyectos Independientes con seguimiento de pagos

$dbPath = __DIR__ . '/billing_system.db';

try {
    $pdo = new PDO("sqlite:$dbPath");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "🚀 Actualizando base de datos a versión 3.0...\n";
    echo "===============================================\n\n";

    // Verificar columnas existentes en la tabla projects
    $columns = $pdo->query("PRAGMA table_info(projects)")->fetchAll(PDO::FETCH_ASSOC);
    $existingColumns = array_column($columns, 'name');
    
    echo "🔧 Expandiendo tabla de proyectos para proyectos independientes...\n";
    
    // Hacer contract_id opcional (para proyectos independientes)
    if (!in_array('is_independent', $existingColumns)) {
        $pdo->exec("ALTER TABLE projects ADD COLUMN is_independent BOOLEAN DEFAULT 0");
    }
    
    // Agregar información del cliente para proyectos independientes
    if (!in_array('client_name', $existingColumns)) {
        $pdo->exec("ALTER TABLE projects ADD COLUMN client_name VARCHAR(255) NULL");
    }
    
    if (!in_array('client_email', $existingColumns)) {
        $pdo->exec("ALTER TABLE projects ADD COLUMN client_email VARCHAR(255) NULL");
    }
    
    if (!in_array('client_phone', $existingColumns)) {
        $pdo->exec("ALTER TABLE projects ADD COLUMN client_phone VARCHAR(50) NULL");
    }
    
    // Agregar campos de facturación y pago
    if (!in_array('hourly_rate', $existingColumns)) {
        $pdo->exec("ALTER TABLE projects ADD COLUMN hourly_rate DECIMAL(10,2) NULL");
    }
    
    if (!in_array('total_amount', $existingColumns)) {
        $pdo->exec("ALTER TABLE projects ADD COLUMN total_amount DECIMAL(12,2) NULL");
    }
    
    if (!in_array('is_paid', $existingColumns)) {
        $pdo->exec("ALTER TABLE projects ADD COLUMN is_paid BOOLEAN DEFAULT 0");
    }
    
    if (!in_array('payment_date', $existingColumns)) {
        $pdo->exec("ALTER TABLE projects ADD COLUMN payment_date DATE NULL");
    }
    
    if (!in_array('payment_method', $existingColumns)) {
        $pdo->exec("ALTER TABLE projects ADD COLUMN payment_method VARCHAR(50) NULL");
    }
    
    if (!in_array('invoice_number', $existingColumns)) {
        $pdo->exec("ALTER TABLE projects ADD COLUMN invoice_number VARCHAR(50) NULL");
    }
    
    if (!in_array('notes', $existingColumns)) {
        $pdo->exec("ALTER TABLE projects ADD COLUMN notes TEXT NULL");
    }

    // Crear tabla de clientes independientes (para proyectos sin contrato)
    echo "👥 Creando tabla de clientes independientes...\n";
    $pdo->exec("CREATE TABLE IF NOT EXISTS independent_clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        company VARCHAR(255),
        tax_id VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // Actualizar la tabla projects para hacer contract_id opcional
    echo "🔄 Actualizando restricciones de tabla projects...\n";
    
    // Crear nueva tabla projects con estructura actualizada
    $pdo->exec("CREATE TABLE projects_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contract_id INTEGER NULL,
        independent_client_id INTEGER NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        estimated_hours DECIMAL(8,2),
        hourly_rate DECIMAL(10,2),
        total_amount DECIMAL(12,2),
        is_independent BOOLEAN DEFAULT 0,
        client_name VARCHAR(255),
        client_email VARCHAR(255),
        client_phone VARCHAR(50),
        is_paid BOOLEAN DEFAULT 0,
        payment_date DATE,
        payment_method VARCHAR(50),
        invoice_number VARCHAR(50),
        notes TEXT,
        status VARCHAR(20) DEFAULT 'active' CHECK(status IN ('active', 'completed', 'on_hold', 'cancelled')),
        start_date DATE,
        end_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
        FOREIGN KEY (independent_client_id) REFERENCES independent_clients(id) ON DELETE CASCADE
    )");

    // Copiar datos existentes
    echo "📊 Migrando datos existentes...\n";
    $pdo->exec("INSERT INTO projects_new (id, contract_id, name, description, estimated_hours, status, start_date, end_date, created_at, updated_at)
                SELECT id, contract_id, name, description, estimated_hours, status, start_date, end_date, created_at, updated_at 
                FROM projects");

    // Reemplazar tabla antigua
    $pdo->exec("DROP TABLE projects");
    $pdo->exec("ALTER TABLE projects_new RENAME TO projects");

    // Crear índices actualizados
    echo "⚡ Recreando índices...\n";
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_projects_contract ON projects(contract_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_projects_independent_client ON projects(independent_client_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_projects_is_independent ON projects(is_independent)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_projects_is_paid ON projects(is_paid)");

    // Insertar algunos clientes independientes de ejemplo
    echo "👤 Insertando clientes independientes de ejemplo...\n";
    $pdo->exec("INSERT OR IGNORE INTO independent_clients (name, email, phone, company) VALUES 
        ('María González', 'maria@freelance.com', '+1-555-0001', 'Freelance Design'),
        ('Tech Startup XYZ', 'contact@techxyz.com', '+1-555-0002', 'Tech Startup XYZ'),
        ('Consultoría Legal ABC', 'info@legalabc.com', '+1-555-0003', 'Consultoría Legal ABC')");

    // Insertar algunos proyectos independientes de ejemplo
    echo "🚀 Insertando proyectos independientes de ejemplo...\n";
    $pdo->exec("INSERT OR IGNORE INTO projects (
        independent_client_id, name, description, estimated_hours, hourly_rate, 
        total_amount, is_independent, client_name, client_email, start_date, is_paid
    ) VALUES 
        (1, 'Diseño de Logo y Branding', 'Desarrollo completo de identidad visual', 15.0, 80.00, 1200.00, 1, 'María González', 'maria@freelance.com', '2024-01-10', 1),
        (2, 'Desarrollo MVP', 'Desarrollo de producto mínimo viable', 120.0, 95.00, 11400.00, 1, 'Tech Startup XYZ', 'contact@techxyz.com', '2024-02-01', 0),
        (3, 'Sistema de Gestión Documental', 'Implementación de sistema de documentos', 60.0, 70.00, 4200.00, 1, 'Consultoría Legal ABC', 'info@legalabc.com', '2024-02-15', 1)");

    // Agregar algunas entradas de tiempo para proyectos independientes
    echo "⏰ Registrando tiempo en proyectos independientes...\n";
    $independentProjects = $pdo->query("SELECT id FROM projects WHERE is_independent = 1")->fetchAll(PDO::FETCH_COLUMN);
    
    if (count($independentProjects) > 0) {
        $pdo->exec("INSERT OR IGNORE INTO time_entries (
            contract_id, project_id, description, hours_used, entry_date, created_by, category_id, month_year
        ) VALUES 
            (NULL, " . $independentProjects[0] . ", 'Investigación y conceptualización', 4.0, '2024-01-11', 'Juan Pérez', 2, '2024-01'),
            (NULL, " . $independentProjects[0] . ", 'Diseño de propuestas iniciales', 6.0, '2024-01-12', 'Juan Pérez', 2, '2024-01'),
            (NULL, " . $independentProjects[1] . ", 'Arquitectura del sistema', 12.0, '2024-02-05', 'María García', 2, '2024-02'),
            (NULL, " . $independentProjects[2] . ", 'Análisis de requerimientos', 8.0, '2024-02-16', 'Carlos López', 4, '2024-02')");
    }

    echo "✅ Actualización completada exitosamente!\n\n";

    // Mostrar estadísticas actualizadas
    echo "📈 Estadísticas Actualizadas:\n";
    echo "============================\n";
    
    $stats = [
        'Contratos' => $pdo->query("SELECT COUNT(*) FROM contracts")->fetchColumn(),
        'Proyectos Vinculados' => $pdo->query("SELECT COUNT(*) FROM projects WHERE is_independent = 0")->fetchColumn(),
        'Proyectos Independientes' => $pdo->query("SELECT COUNT(*) FROM projects WHERE is_independent = 1")->fetchColumn(),
        'Clientes Independientes' => $pdo->query("SELECT COUNT(*) FROM independent_clients")->fetchColumn(),
        'Total Entradas de Tiempo' => $pdo->query("SELECT COUNT(*) FROM time_entries")->fetchColumn(),
    ];
    
    foreach ($stats as $label => $count) {
        echo "- {$label}: {$count}\n";
    }
    
    echo "\n💰 Resumen Financiero de Proyectos Independientes:\n";
    $financialStats = $pdo->query("
        SELECT 
            COUNT(*) as total_projects,
            SUM(CASE WHEN is_paid = 1 THEN 1 ELSE 0 END) as paid_projects,
            SUM(total_amount) as total_value,
            SUM(CASE WHEN is_paid = 1 THEN total_amount ELSE 0 END) as paid_amount,
            SUM(CASE WHEN is_paid = 0 THEN total_amount ELSE 0 END) as pending_amount
        FROM projects 
        WHERE is_independent = 1
    ")->fetch(PDO::FETCH_ASSOC);
    
    if ($financialStats) {
        echo "- Total Proyectos Independientes: {$financialStats['total_projects']}\n";
        echo "- Proyectos Pagados: {$financialStats['paid_projects']}\n";
        echo "- Valor Total: $" . number_format($financialStats['total_value'], 2) . "\n";
        echo "- Monto Pagado: $" . number_format($financialStats['paid_amount'], 2) . "\n";
        echo "- Monto Pendiente: $" . number_format($financialStats['pending_amount'], 2) . "\n";
    }
    
    echo "\n🎯 Nuevas funcionalidades disponibles:\n";
    echo "- ✅ Proyectos independientes (sin contrato vinculado)\n";
    echo "- ✅ Gestión de clientes independientes\n";
    echo "- ✅ Seguimiento de pagos y facturación\n";
    echo "- ✅ Registro de horas en proyectos independientes\n";
    echo "- ✅ Reportes financieros por proyecto\n";
    echo "- ✅ Estados de pago: Pagado/Pendiente\n";

} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}