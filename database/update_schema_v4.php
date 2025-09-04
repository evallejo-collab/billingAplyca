<?php

// Script para actualizar la base de datos a versión 4.0
// Expansión de gestión de clientes y soporte para pesos colombianos

$dbPath = __DIR__ . '/billing_system.db';

try {
    $pdo = new PDO("sqlite:$dbPath");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "🚀 Actualizando base de datos a versión 4.0...\\n";
    echo "===============================================\\n\\n";

    // Verificar columnas existentes en la tabla clients
    $columns = $pdo->query("PRAGMA table_info(clients)")->fetchAll(PDO::FETCH_ASSOC);
    $existingColumns = array_column($columns, 'name');
    
    echo "🏢 Expandiendo tabla de clientes...\\n";
    
    // Agregar campos adicionales para clientes
    if (!in_array('company', $existingColumns)) {
        $pdo->exec("ALTER TABLE clients ADD COLUMN company VARCHAR(255) NULL");
    }
    
    if (!in_array('tax_id', $existingColumns)) {
        $pdo->exec("ALTER TABLE clients ADD COLUMN tax_id VARCHAR(50) NULL");
    }
    
    if (!in_array('contact_person', $existingColumns)) {
        $pdo->exec("ALTER TABLE clients ADD COLUMN contact_person VARCHAR(255) NULL");
    }
    
    if (!in_array('website', $existingColumns)) {
        $pdo->exec("ALTER TABLE clients ADD COLUMN website VARCHAR(255) NULL");
    }
    
    if (!in_array('notes', $existingColumns)) {
        $pdo->exec("ALTER TABLE clients ADD COLUMN notes TEXT NULL");
    }
    
    if (!in_array('is_active', $existingColumns)) {
        $pdo->exec("ALTER TABLE clients ADD COLUMN is_active BOOLEAN DEFAULT 1");
    }

    // Verificar si necesitamos agregar client_id a projects
    $projectColumns = $pdo->query("PRAGMA table_info(projects)")->fetchAll(PDO::FETCH_ASSOC);
    $existingProjectColumns = array_column($projectColumns, 'name');
    
    if (!in_array('client_id', $existingProjectColumns)) {
        echo "🔧 Agregando client_id a tabla projects...\\n";
        $pdo->exec("ALTER TABLE projects ADD COLUMN client_id INTEGER NULL");
        
        // Crear índice para client_id en projects
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id)");
    }
    
    echo "📊 Insertando clientes de ejemplo...\\n";
    $pdo->exec("INSERT OR IGNORE INTO clients (name, email, phone, address, company, tax_id, contact_person) VALUES 
        ('Empresa ABC S.A.S.', 'contacto@empresaabc.com', '+57-1-555-0001', 'Calle 100 #15-20, Bogotá', 'Empresa ABC S.A.S.', '900123456-1', 'Carlos Rodríguez'),
        ('Tecnologías XYZ Ltda.', 'info@techxyz.com', '+57-2-555-0002', 'Carrera 10 #25-30, Cali', 'Tecnologías XYZ Ltda.', '900234567-2', 'María González'),
        ('Consultoría Integral', 'gerencia@consultoria.co', '+57-4-555-0003', 'Avenida El Poblado #45-12, Medellín', 'Consultoría Integral S.A.', '900345678-3', 'Ana López'),
        ('Startup Innovadora', 'hello@startup.co', '+57-1-555-0004', 'Zona Rosa, Bogotá', 'Startup Innovadora SAS', '900456789-4', 'Diego Martínez'),
        ('Comercializadora del Norte', 'ventas@norte.com.co', '+57-5-555-0005', 'Centro Histórico, Cartagena', 'Comercializadora del Norte S.A.', '900567890-5', 'Sofía Herrera')");

    // Actualizar algunos contratos existentes para vincularlos con clientes
    echo "🔄 Vinculando contratos existentes con clientes...\\n";
    $pdo->exec("UPDATE contracts SET client_id = 1 WHERE id = 1");
    $pdo->exec("UPDATE contracts SET client_id = 2 WHERE id = 2");
    $pdo->exec("UPDATE contracts SET client_id = 3 WHERE id = 3");
    
    // Vincular algunos proyectos con clientes
    $pdo->exec("UPDATE projects SET client_id = 1 WHERE contract_id = 1");
    $pdo->exec("UPDATE projects SET client_id = 2 WHERE contract_id = 2");
    $pdo->exec("UPDATE projects SET client_id = 3 WHERE contract_id = 3");

    echo "✅ Actualización completada exitosamente!\\n\\n";

    // Mostrar estadísticas actualizadas
    echo "📈 Estadísticas Actualizadas:\\n";
    echo "============================\\n";
    
    $stats = [
        'Clientes' => $pdo->query("SELECT COUNT(*) FROM clients")->fetchColumn(),
        'Contratos' => $pdo->query("SELECT COUNT(*) FROM contracts")->fetchColumn(),
        'Proyectos Vinculados' => $pdo->query("SELECT COUNT(*) FROM projects WHERE is_independent = 0")->fetchColumn(),
        'Proyectos Independientes' => $pdo->query("SELECT COUNT(*) FROM projects WHERE is_independent = 1")->fetchColumn(),
        'Clientes Independientes' => $pdo->query("SELECT COUNT(*) FROM independent_clients")->fetchColumn(),
        'Total Entradas de Tiempo' => $pdo->query("SELECT COUNT(*) FROM time_entries")->fetchColumn(),
    ];
    
    foreach ($stats as $label => $count) {
        echo "- {$label}: {$count}\\n";
    }
    
    echo "\\n💰 Resumen Financiero (en COP):\\n";
    $financialStats = $pdo->query("
        SELECT 
            COALESCE(SUM(total_amount), 0) as total_contracts_value,
            COALESCE(AVG(hourly_rate), 0) as avg_hourly_rate
        FROM contracts
    ")->fetch(PDO::FETCH_ASSOC);
    
    $independentStats = $pdo->query("
        SELECT 
            COALESCE(SUM(total_amount), 0) as total_independent_value,
            COUNT(*) as total_independent_projects
        FROM projects 
        WHERE is_independent = 1
    ")->fetch(PDO::FETCH_ASSOC);
    
    if ($financialStats) {
        echo "- Valor Total Contratos: $" . number_format($financialStats['total_contracts_value'], 0, ',', '.') . " COP\\n";
        echo "- Tarifa Promedio por Hora: $" . number_format($financialStats['avg_hourly_rate'], 0, ',', '.') . " COP\\n";
    }
    
    if ($independentStats) {
        echo "- Valor Proyectos Independientes: $" . number_format($independentStats['total_independent_value'], 0, ',', '.') . " COP\\n";
        echo "- Total Proyectos Independientes: {$independentStats['total_independent_projects']}\\n";
    }
    
    echo "\\n🎯 Nuevas funcionalidades disponibles:\\n";
    echo "- ✅ Gestión completa de clientes\\n";
    echo "- ✅ Clientes pueden tener múltiples contratos y proyectos\\n";
    echo "- ✅ Valores en pesos colombianos (COP)\\n";
    echo "- ✅ Información empresarial de clientes\\n";
    echo "- ✅ Búsqueda y filtrado de clientes\\n";
    echo "- ✅ Dashboard de cliente con resumen financiero\\n";

} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\\n";
}