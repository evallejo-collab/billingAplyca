<?php

require_once __DIR__ . '/Project.php';

class TimeEntry {
    private $db;
    
    public function __construct($database) {
        $this->db = $database;
    }
    
    public function create($contractId, $description, $hoursUsed, $entryDate, $createdBy = null, $notes = null, $categoryId = 1, $projectId = null) {
        $contract = new Contract($this->db);
        
        // Validar horas disponibles en el contrato
        if (!$contract->canDeductHours($contractId, $hoursUsed)) {
            throw new Exception("No hay suficientes horas disponibles en el contrato");
        }
        
        // Si se especifica un proyecto, validar horas disponibles del proyecto
        if ($projectId) {
            $project = new Project($this->db);
            $projectData = $project->getById($projectId);
            
            if (!$projectData) {
                throw new Exception("Proyecto no encontrado");
            }
            
            if ($projectData['estimated_hours'] && $projectData['remaining_hours'] < $hoursUsed) {
                throw new Exception("No hay suficientes horas disponibles en el proyecto");
            }
        }
        
        $monthYear = date('Y-m', strtotime($entryDate));
        
        $sql = "INSERT INTO time_entries (contract_id, description, hours_used, entry_date, created_by, notes, category_id, project_id, month_year) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$contractId, $description, $hoursUsed, $entryDate, $createdBy, $notes, $categoryId, $projectId, $monthYear]);
    }
    
    public function getByContract($contractId) {
        $sql = "SELECT te.*, c.contract_number, c.hourly_rate,
                       (te.hours_used * c.hourly_rate) as amount,
                       hc.name as category_name, hc.color as category_color,
                       p.name as project_name
                FROM time_entries te
                JOIN contracts c ON te.contract_id = c.id
                LEFT JOIN hour_categories hc ON te.category_id = hc.id
                LEFT JOIN projects p ON te.project_id = p.id
                WHERE te.contract_id = ?
                ORDER BY te.entry_date DESC, te.created_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$contractId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getById($id) {
        $sql = "SELECT te.*, c.contract_number, c.hourly_rate,
                       (te.hours_used * c.hourly_rate) as amount
                FROM time_entries te
                JOIN contracts c ON te.contract_id = c.id
                WHERE te.id = ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function getByDateRange($startDate, $endDate, $contractId = null) {
        $sql = "SELECT te.*, c.contract_number, cl.name as client_name, c.hourly_rate,
                       (te.hours_used * c.hourly_rate) as amount,
                       hc.name as category_name, hc.color as category_color,
                       p.name as project_name
                FROM time_entries te
                JOIN contracts c ON te.contract_id = c.id
                JOIN clients cl ON c.client_id = cl.id
                LEFT JOIN hour_categories hc ON te.category_id = hc.id
                LEFT JOIN projects p ON te.project_id = p.id
                WHERE te.entry_date BETWEEN ? AND ?";
        
        $params = [$startDate, $endDate];
        
        if ($contractId) {
            $sql .= " AND te.contract_id = ?";
            $params[] = $contractId;
        }
        
        $sql .= " ORDER BY te.entry_date DESC, te.created_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function update($id, $description, $hoursUsed, $entryDate, $notes = null) {
        $timeEntry = $this->getById($id);
        if (!$timeEntry) {
            throw new Exception("Entrada de tiempo no encontrada");
        }
        
        $contract = new Contract($this->db);
        $currentRemainingHours = $contract->getRemainingHours($timeEntry['contract_id']);
        $availableHours = $currentRemainingHours + $timeEntry['hours_used'];
        
        if ($availableHours < $hoursUsed) {
            throw new Exception("No hay suficientes horas disponibles en el contrato");
        }
        
        $sql = "UPDATE time_entries 
                SET description = ?, hours_used = ?, entry_date = ?, notes = ?
                WHERE id = ?";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$description, $hoursUsed, $entryDate, $notes, $id]);
    }
    
    public function delete($id) {
        $sql = "DELETE FROM time_entries WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$id]);
    }
    
    public function getTotalHoursByContract($contractId) {
        $sql = "SELECT SUM(hours_used) as total_hours FROM time_entries WHERE contract_id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$contractId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $result['total_hours'] : 0;
    }
    
    public function getTotalAmountByContract($contractId) {
        $sql = "SELECT SUM(te.hours_used * c.hourly_rate) as total_amount
                FROM time_entries te
                JOIN contracts c ON te.contract_id = c.id
                WHERE te.contract_id = ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$contractId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $result['total_amount'] : 0;
    }
}