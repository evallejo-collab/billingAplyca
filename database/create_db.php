<?php

// Script para crear la base de datos SQLite y las tablas

$dbPath = __DIR__ . '/billing_system.db';

try {
    $pdo = new PDO("sqlite:$dbPath");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Creando base de datos SQLite...\n";
    
    // Crear tabla de clientes
    echo "Creando tabla clients...\n";
    $pdo->exec("CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    
    // Crear tabla de contratos
    echo "Creando tabla contracts...\n";
    $pdo->exec("CREATE TABLE IF NOT EXISTS contracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        contract_number VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        total_hours DECIMAL(8,2) NOT NULL,
        hourly_rate DECIMAL(10,2) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        status VARCHAR(20) DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )");
    
    // Crear tabla de entradas de tiempo
    echo "Creando tabla time_entries...\n";
    $pdo->exec("CREATE TABLE IF NOT EXISTS time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contract_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        hours_used DECIMAL(8,2) NOT NULL,
        entry_date DATE NOT NULL,
        created_by VARCHAR(100),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
    )");
    
    // Crear índices
    echo "Creando índices...\n";
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_time_entries_contract_id ON time_entries(contract_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(entry_date)");
    
    // Insertar datos de ejemplo
    echo "Insertando datos de ejemplo...\n";
    
    // Clientes de ejemplo
    $pdo->exec("INSERT OR IGNORE INTO clients (id, name, email, phone, address) VALUES 
        (1, 'Empresa ABC S.A.', 'contacto@empresaabc.com', '+1-555-0123', '123 Main St, Ciudad'),
        (2, 'Tech Solutions Ltd.', 'admin@techsolutions.com', '+1-555-0456', '456 Oak Ave, Ciudad'),
        (3, 'Startup Innovation', 'hello@startup.com', '+1-555-0789', '789 Pine Rd, Ciudad')");
    
    // Contratos de ejemplo
    $pdo->exec("INSERT OR IGNORE INTO contracts (id, client_id, contract_number, description, total_hours, hourly_rate, start_date, status) VALUES 
        (1, 1, 'CONT-2024-0001', 'Desarrollo de sistema de gestión empresarial', 120.0, 75.00, '2024-01-15', 'active'),
        (2, 2, 'CONT-2024-0002', 'Mantenimiento y soporte técnico', 80.0, 60.00, '2024-02-01', 'active'),
        (3, 1, 'CONT-2024-0003', 'Consultoría en optimización de procesos', 40.0, 100.00, '2024-01-20', 'completed'),
        (4, 3, 'CONT-2024-0004', 'Desarrollo de aplicación móvil', 200.0, 85.00, '2024-03-01', 'active')");
    
    // Entradas de tiempo de ejemplo
    $pdo->exec("INSERT OR IGNORE INTO time_entries (contract_id, description, hours_used, entry_date, created_by) VALUES 
        (1, 'Análisis de requerimientos y diseño inicial', 8.0, '2024-01-16', 'Juan Pérez'),
        (1, 'Desarrollo del módulo de usuarios', 12.0, '2024-01-18', 'María García'),
        (1, 'Implementación de base de datos', 6.5, '2024-01-20', 'Carlos López'),
        (2, 'Revisión y actualización del sistema', 4.0, '2024-02-02', 'Ana Martín'),
        (2, 'Soporte técnico y resolución de incidencias', 8.0, '2024-02-05', 'Luis Rodríguez'),
        (3, 'Auditoría de procesos actuales', 16.0, '2024-01-22', 'Carmen Ruiz'),
        (3, 'Propuesta de mejoras y documentación', 24.0, '2024-01-25', 'Carmen Ruiz'),
        (4, 'Diseño de interfaz y prototipado', 15.0, '2024-03-03', 'Diego Silva'),
        (4, 'Desarrollo del backend API', 20.0, '2024-03-08', 'Elena Vargas')");
    
    echo "✅ Base de datos creada exitosamente!\n";
    echo "📍 Ubicación: $dbPath\n";
    echo "📊 Datos de ejemplo insertados\n\n";
    
    // Mostrar resumen
    $clientsCount = $pdo->query("SELECT COUNT(*) FROM clients")->fetchColumn();
    $contractsCount = $pdo->query("SELECT COUNT(*) FROM contracts")->fetchColumn();
    $timeEntriesCount = $pdo->query("SELECT COUNT(*) FROM time_entries")->fetchColumn();
    
    echo "📈 Resumen:\n";
    echo "- Clientes: $clientsCount\n";
    echo "- Contratos: $contractsCount\n";
    echo "- Entradas de tiempo: $timeEntriesCount\n";
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}