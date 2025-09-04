-- Sistema de Facturación - Schema de Base de Datos

CREATE DATABASE billing_system;
USE billing_system;

-- Tabla de Clientes
CREATE TABLE clients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de Contratos
CREATE TABLE contracts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT NOT NULL,
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    total_hours DECIMAL(8,2) NOT NULL,
    hourly_rate DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_hours * hourly_rate) STORED,
    start_date DATE NOT NULL,
    end_date DATE,
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Tabla de Entradas de Tiempo (Descuento de Horas)
CREATE TABLE time_entries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    contract_id INT NOT NULL,
    description TEXT NOT NULL,
    hours_used DECIMAL(8,2) NOT NULL,
    entry_date DATE NOT NULL,
    created_by VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
);

-- Vista para resumen de contratos con horas utilizadas
CREATE VIEW contract_summary AS
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
    c.end_date
FROM contracts c
JOIN clients cl ON c.client_id = cl.id
LEFT JOIN time_entries te ON c.id = te.contract_id
GROUP BY c.id, cl.name;

-- Índices para mejorar rendimiento
CREATE INDEX idx_contracts_client_id ON contracts(client_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_time_entries_contract_id ON time_entries(contract_id);
CREATE INDEX idx_time_entries_date ON time_entries(entry_date);