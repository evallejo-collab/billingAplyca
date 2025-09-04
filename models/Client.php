<?php

class Client {
    private $db;
    
    public function __construct($database) {
        $this->db = $database;
    }
    
    public function create($name, $email, $phone = null, $address = null, $company = null, $taxId = null, $contactPerson = null) {
        $sql = "INSERT INTO clients (name, email, phone, address, company, tax_id, contact_person) 
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$name, $email, $phone, $address, $company, $taxId, $contactPerson]);
    }
    
    public function getById($id) {
        $sql = "SELECT * FROM clients WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function getAll() {
        $sql = "SELECT c.*,
                       COUNT(DISTINCT co.id) as contracts_count,
                       COUNT(DISTINCT p.id) as projects_count,
                       COALESCE(SUM(DISTINCT (co.total_hours * co.hourly_rate)), 0) as total_contract_value,
                       COALESCE(SUM(DISTINCT p.total_amount), 0) as total_project_value,
                       (COALESCE(SUM(DISTINCT (co.total_hours * co.hourly_rate)), 0) + COALESCE(SUM(DISTINCT p.total_amount), 0)) as total_value
                FROM clients c
                LEFT JOIN contracts co ON c.id = co.client_id
                LEFT JOIN projects p ON c.id = p.client_id AND p.is_independent = 0
                GROUP BY c.id
                ORDER BY c.created_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function update($id, $name, $email, $phone = null, $address = null, $company = null, $taxId = null, $contactPerson = null) {
        $sql = "UPDATE clients 
                SET name = ?, email = ?, phone = ?, address = ?, company = ?, tax_id = ?, contact_person = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$name, $email, $phone, $address, $company, $taxId, $contactPerson, $id]);
    }
    
    public function delete($id) {
        // Verificar que no tenga contratos asociados
        $contractsCount = $this->db->prepare("SELECT COUNT(*) FROM contracts WHERE client_id = ?");
        $contractsCount->execute([$id]);
        
        if ($contractsCount->fetchColumn() > 0) {
            throw new Exception("No se puede eliminar el cliente porque tiene contratos asociados");
        }
        
        // Verificar que no tenga proyectos asociados
        $projectsCount = $this->db->prepare("SELECT COUNT(*) FROM projects WHERE client_id = ?");
        $projectsCount->execute([$id]);
        
        if ($projectsCount->fetchColumn() > 0) {
            throw new Exception("No se puede eliminar el cliente porque tiene proyectos asociados");
        }
        
        $sql = "DELETE FROM clients WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$id]);
    }
    
    public function getClientContracts($clientId) {
        $sql = "SELECT c.*, 
                       (c.total_hours * c.hourly_rate) as total_amount,
                       COALESCE(SUM(te.hours_used), 0) as used_hours,
                       (c.total_hours - COALESCE(SUM(te.hours_used), 0)) as remaining_hours,
                       (COALESCE(SUM(te.hours_used), 0) * c.hourly_rate) as billed_amount,
                       COUNT(te.id) as entries_count
                FROM contracts c
                LEFT JOIN time_entries te ON c.id = te.contract_id
                WHERE c.client_id = ?
                GROUP BY c.id
                ORDER BY c.created_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$clientId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getClientProjects($clientId) {
        $sql = "SELECT p.*, 
                       COALESCE(SUM(te.hours_used), 0) as used_hours,
                       (p.estimated_hours - COALESCE(SUM(te.hours_used), 0)) as remaining_hours,
                       COUNT(te.id) as entries_count,
                       (COALESCE(SUM(te.hours_used), 0) * p.hourly_rate) as current_cost
                FROM projects p
                LEFT JOIN time_entries te ON p.id = te.project_id
                WHERE (p.client_id = ? AND p.is_independent = 0)
                GROUP BY p.id
                ORDER BY p.created_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$clientId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getClientSummary($clientId) {
        $sql = "SELECT 
                    c.*,
                    COUNT(DISTINCT co.id) as contracts_count,
                    COUNT(DISTINCT p.id) as projects_count,
                    COALESCE(SUM(DISTINCT (co.total_hours * co.hourly_rate)), 0) as total_contract_value,
                    COALESCE(SUM(DISTINCT p.total_amount), 0) as total_project_value,
                    COALESCE(SUM(DISTINCT te_contracts.hours_used), 0) as total_contract_hours_used,
                    COALESCE(SUM(DISTINCT te_projects.hours_used), 0) as total_project_hours_used,
                    COALESCE(SUM(DISTINCT te_contracts.hours_used * co.hourly_rate), 0) as total_contract_billed,
                    COALESCE(SUM(DISTINCT te_projects.hours_used * p.hourly_rate), 0) as total_project_billed
                FROM clients c
                LEFT JOIN contracts co ON c.id = co.client_id
                LEFT JOIN projects p ON c.id = p.client_id AND p.is_independent = 0
                LEFT JOIN time_entries te_contracts ON co.id = te_contracts.contract_id
                LEFT JOIN time_entries te_projects ON p.id = te_projects.project_id
                WHERE c.id = ?
                GROUP BY c.id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$clientId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function searchClients($searchTerm) {
        $searchTerm = "%{$searchTerm}%";
        $sql = "SELECT c.*,
                       COUNT(DISTINCT co.id) as contracts_count,
                       COUNT(DISTINCT p.id) as projects_count
                FROM clients c
                LEFT JOIN contracts co ON c.id = co.client_id
                LEFT JOIN projects p ON c.id = p.client_id AND p.is_independent = 0
                WHERE c.name LIKE ? OR c.email LIKE ? OR c.company LIKE ?
                GROUP BY c.id
                ORDER BY c.name ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$searchTerm, $searchTerm, $searchTerm]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}