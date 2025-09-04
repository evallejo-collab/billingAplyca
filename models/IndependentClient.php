<?php

class IndependentClient {
    private $db;
    
    public function __construct($database) {
        $this->db = $database;
    }
    
    public function create($name, $email = null, $phone = null, $address = null, $company = null, $taxId = null) {
        $sql = "INSERT INTO independent_clients (name, email, phone, address, company, tax_id) 
                VALUES (?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$name, $email, $phone, $address, $company, $taxId]);
    }
    
    public function getById($id) {
        $sql = "SELECT * FROM independent_clients WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function getAll() {
        $sql = "SELECT ic.*,
                       COUNT(p.id) as projects_count,
                       COALESCE(SUM(p.total_amount), 0) as total_value,
                       COALESCE(SUM(CASE WHEN p.is_paid = 1 THEN p.total_amount ELSE 0 END), 0) as paid_amount
                FROM independent_clients ic
                LEFT JOIN projects p ON ic.id = p.independent_client_id AND p.is_independent = 1
                GROUP BY ic.id
                ORDER BY ic.created_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function update($id, $name, $email = null, $phone = null, $address = null, $company = null, $taxId = null) {
        $sql = "UPDATE independent_clients 
                SET name = ?, email = ?, phone = ?, address = ?, company = ?, tax_id = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$name, $email, $phone, $address, $company, $taxId, $id]);
    }
    
    public function delete($id) {
        // Verificar que no tenga proyectos asociados
        $projectsCount = $this->db->prepare("SELECT COUNT(*) FROM projects WHERE independent_client_id = ?");
        $projectsCount->execute([$id]);
        
        if ($projectsCount->fetchColumn() > 0) {
            throw new Exception("No se puede eliminar el cliente porque tiene proyectos asociados");
        }
        
        $sql = "DELETE FROM independent_clients WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$id]);
    }
    
    public function getClientProjects($clientId) {
        $sql = "SELECT p.*, 
                       COALESCE(SUM(te.hours_used), 0) as used_hours,
                       (p.estimated_hours - COALESCE(SUM(te.hours_used), 0)) as remaining_hours,
                       COUNT(te.id) as entries_count
                FROM projects p
                LEFT JOIN time_entries te ON p.id = te.project_id
                WHERE p.independent_client_id = ? AND p.is_independent = 1
                GROUP BY p.id
                ORDER BY p.created_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$clientId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}