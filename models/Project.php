<?php

class Project {
    private $db;
    
    public function __construct($database) {
        $this->db = $database;
    }
    
    public function create($name, $description = null, $estimatedHours = null, $startDate = null, $endDate = null, $contractId = null, $independentClientId = null, $clientName = null, $clientEmail = null, $clientPhone = null, $hourlyRate = null, $totalAmount = null, $isIndependent = false) {
        if ($isIndependent) {
            $sql = "INSERT INTO projects (name, description, estimated_hours, start_date, end_date, independent_client_id, client_name, client_email, client_phone, hourly_rate, total_amount, is_independent) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)";
            
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$name, $description, $estimatedHours, $startDate, $endDate, $independentClientId, $clientName, $clientEmail, $clientPhone, $hourlyRate, $totalAmount]);
        } else {
            $sql = "INSERT INTO projects (contract_id, name, description, estimated_hours, start_date, end_date, is_independent) 
                    VALUES (?, ?, ?, ?, ?, ?, 0)";
            
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$contractId, $name, $description, $estimatedHours, $startDate, $endDate]);
        }
    }
    
    public function getById($id) {
        $sql = "SELECT p.*, 
                       CASE WHEN p.is_independent = 1 
                            THEN COALESCE(p.client_name, ic.name) 
                            ELSE cl.name END as client_name,
                       CASE WHEN p.is_independent = 1 
                            THEN 'INDEPENDENT' 
                            ELSE c.contract_number END as contract_number,
                       COALESCE(SUM(te.hours_used), 0) as used_hours,
                       (p.estimated_hours - COALESCE(SUM(te.hours_used), 0)) as remaining_hours,
                       CASE WHEN p.is_independent = 1 
                            THEN (COALESCE(SUM(te.hours_used), 0) * p.hourly_rate)
                            ELSE (COALESCE(SUM(te.hours_used), 0) * c.hourly_rate) END as current_cost
                FROM projects p
                LEFT JOIN contracts c ON p.contract_id = c.id AND p.is_independent = 0
                LEFT JOIN clients cl ON c.client_id = cl.id
                LEFT JOIN independent_clients ic ON p.independent_client_id = ic.id AND p.is_independent = 1
                LEFT JOIN time_entries te ON p.id = te.project_id
                WHERE p.id = ?
                GROUP BY p.id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function getByContract($contractId) {
        $sql = "SELECT p.*, 
                       COALESCE(SUM(te.hours_used), 0) as used_hours,
                       (p.estimated_hours - COALESCE(SUM(te.hours_used), 0)) as remaining_hours,
                       COUNT(te.id) as entries_count
                FROM projects p
                LEFT JOIN time_entries te ON p.id = te.project_id
                WHERE p.contract_id = ?
                GROUP BY p.id
                ORDER BY p.created_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$contractId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getAll($status = null) {
        $sql = "SELECT p.*, c.contract_number, cl.name as client_name,
                       COALESCE(SUM(te.hours_used), 0) as used_hours,
                       (p.estimated_hours - COALESCE(SUM(te.hours_used), 0)) as remaining_hours,
                       COUNT(te.id) as entries_count
                FROM projects p
                JOIN contracts c ON p.contract_id = c.id
                JOIN clients cl ON c.client_id = cl.id
                LEFT JOIN time_entries te ON p.id = te.project_id";
        
        $params = [];
        if ($status) {
            $sql .= " WHERE p.status = ?";
            $params[] = $status;
        }
        
        $sql .= " GROUP BY p.id, c.contract_number, cl.name ORDER BY p.created_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function updateStatus($id, $status) {
        $sql = "UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$status, $id]);
    }
    
    public function update($id, $name, $description = null, $estimatedHours = null, $startDate = null, $endDate = null) {
        $sql = "UPDATE projects 
                SET name = ?, description = ?, estimated_hours = ?, start_date = ?, end_date = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$name, $description, $estimatedHours, $startDate, $endDate, $id]);
    }
    
    public function delete($id) {
        // Verificar que no tenga entradas de tiempo asociadas
        $entriesCount = $this->db->prepare("SELECT COUNT(*) FROM time_entries WHERE project_id = ?");
        $entriesCount->execute([$id]);
        
        if ($entriesCount->fetchColumn() > 0) {
            throw new Exception("No se puede eliminar el proyecto porque tiene entradas de tiempo asociadas");
        }
        
        $sql = "DELETE FROM projects WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$id]);
    }
    
    public function getProjectSummary($id) {
        $sql = "SELECT p.*, c.contract_number, cl.name as client_name, c.hourly_rate,
                       COALESCE(SUM(te.hours_used), 0) as used_hours,
                       (p.estimated_hours - COALESCE(SUM(te.hours_used), 0)) as remaining_hours,
                       (COALESCE(SUM(te.hours_used), 0) * c.hourly_rate) as total_cost,
                       COUNT(te.id) as entries_count
                FROM projects p
                JOIN contracts c ON p.contract_id = c.id
                JOIN clients cl ON c.client_id = cl.id
                LEFT JOIN time_entries te ON p.id = te.project_id
                WHERE p.id = ?
                GROUP BY p.id, c.contract_number, cl.name, c.hourly_rate";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function getActiveProjectsForContract($contractId) {
        $sql = "SELECT id, name, estimated_hours,
                       COALESCE(SUM(te.hours_used), 0) as used_hours,
                       (estimated_hours - COALESCE(SUM(te.hours_used), 0)) as remaining_hours
                FROM projects p
                LEFT JOIN time_entries te ON p.id = te.project_id
                WHERE p.contract_id = ? AND p.status = 'active' AND p.estimated_hours > 0 AND p.is_independent = 0
                GROUP BY p.id, p.name, p.estimated_hours
                HAVING remaining_hours > 0
                ORDER BY p.name";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$contractId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getIndependentProjects($status = null) {
        $sql = "SELECT p.*, 
                       COALESCE(ic.name, p.client_name) as client_name,
                       COALESCE(SUM(te.hours_used), 0) as used_hours,
                       (p.estimated_hours - COALESCE(SUM(te.hours_used), 0)) as remaining_hours,
                       COUNT(te.id) as entries_count,
                       (COALESCE(SUM(te.hours_used), 0) * p.hourly_rate) as current_cost
                FROM projects p
                LEFT JOIN independent_clients ic ON p.independent_client_id = ic.id
                LEFT JOIN time_entries te ON p.id = te.project_id
                WHERE p.is_independent = 1";
        
        $params = [];
        if ($status) {
            $sql .= " AND p.status = ?";
            $params[] = $status;
        }
        
        $sql .= " GROUP BY p.id ORDER BY p.created_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function updatePaymentStatus($id, $isPaid, $paymentDate = null, $paymentMethod = null, $invoiceNumber = null) {
        $sql = "UPDATE projects 
                SET is_paid = ?, payment_date = ?, payment_method = ?, invoice_number = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND is_independent = 1";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$isPaid, $paymentDate, $paymentMethod, $invoiceNumber, $id]);
    }
    
    public function getFinancialSummary($isIndependent = false) {
        if ($isIndependent) {
            $sql = "SELECT 
                        COUNT(*) as total_projects,
                        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_projects,
                        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_projects,
                        SUM(CASE WHEN is_paid = 1 THEN 1 ELSE 0 END) as paid_projects,
                        SUM(CASE WHEN is_paid = 0 THEN 1 ELSE 0 END) as unpaid_projects,
                        COALESCE(SUM(total_amount), 0) as total_value,
                        COALESCE(SUM(CASE WHEN is_paid = 1 THEN total_amount ELSE 0 END), 0) as paid_amount,
                        COALESCE(SUM(CASE WHEN is_paid = 0 THEN total_amount ELSE 0 END), 0) as pending_amount,
                        COALESCE(SUM(estimated_hours), 0) as total_estimated_hours
                    FROM projects 
                    WHERE is_independent = 1";
        } else {
            $sql = "SELECT 
                        COUNT(*) as total_projects,
                        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_projects,
                        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_projects,
                        COALESCE(SUM(estimated_hours), 0) as total_estimated_hours
                    FROM projects 
                    WHERE is_independent = 0";
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}