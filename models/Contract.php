<?php

class Contract {
    private $db;
    
    public function __construct($database) {
        $this->db = $database;
    }
    
    public function create($clientId, $contractNumber, $description, $totalHours, $hourlyRate, $startDate, $endDate = null) {
        $sql = "INSERT INTO contracts (client_id, contract_number, description, total_hours, hourly_rate, start_date, end_date) 
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$clientId, $contractNumber, $description, $totalHours, $hourlyRate, $startDate, $endDate]);
    }
    
    public function getById($id) {
        $sql = "SELECT 
                    c.id,
                    c.contract_number,
                    cl.name as client_name,
                    c.description,
                    c.total_hours,
                    COALESCE(SUM(te.hours_used), 0) as used_hours,
                    (c.total_hours - COALESCE(SUM(te.hours_used), 0)) as remaining_hours,
                    c.hourly_rate,
                    (c.total_hours * c.hourly_rate) as total_amount,
                    (COALESCE(SUM(te.hours_used), 0) * c.hourly_rate) as billed_amount,
                    ((c.total_hours - COALESCE(SUM(te.hours_used), 0)) * c.hourly_rate) as remaining_amount,
                    c.status,
                    c.start_date,
                    c.end_date,
                    c.client_id
                FROM contracts c
                JOIN clients cl ON c.client_id = cl.id
                LEFT JOIN time_entries te ON c.id = te.contract_id
                WHERE c.id = ?
                GROUP BY c.id, cl.name";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function getAll($status = null) {
        $sql = "SELECT 
                    c.id,
                    c.contract_number,
                    cl.name as client_name,
                    c.description,
                    c.total_hours,
                    COALESCE(SUM(te.hours_used), 0) as used_hours,
                    (c.total_hours - COALESCE(SUM(te.hours_used), 0)) as remaining_hours,
                    c.hourly_rate,
                    (c.total_hours * c.hourly_rate) as total_amount,
                    (COALESCE(SUM(te.hours_used), 0) * c.hourly_rate) as billed_amount,
                    ((c.total_hours - COALESCE(SUM(te.hours_used), 0)) * c.hourly_rate) as remaining_amount,
                    c.status,
                    c.start_date,
                    c.end_date,
                    c.client_id
                FROM contracts c
                JOIN clients cl ON c.client_id = cl.id
                LEFT JOIN time_entries te ON c.id = te.contract_id";
        
        $params = [];
        if ($status) {
            $sql .= " WHERE c.status = ?";
            $params[] = $status;
        }
        
        $sql .= " GROUP BY c.id, cl.name ORDER BY c.start_date DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getByClient($clientId) {
        $sql = "SELECT 
                    c.id,
                    c.contract_number,
                    cl.name as client_name,
                    c.description,
                    c.total_hours,
                    COALESCE(SUM(te.hours_used), 0) as used_hours,
                    (c.total_hours - COALESCE(SUM(te.hours_used), 0)) as remaining_hours,
                    c.hourly_rate,
                    (c.total_hours * c.hourly_rate) as total_amount,
                    (COALESCE(SUM(te.hours_used), 0) * c.hourly_rate) as billed_amount,
                    ((c.total_hours - COALESCE(SUM(te.hours_used), 0)) * c.hourly_rate) as remaining_amount,
                    c.status,
                    c.start_date,
                    c.end_date,
                    c.client_id
                FROM contracts c
                JOIN clients cl ON c.client_id = cl.id
                LEFT JOIN time_entries te ON c.id = te.contract_id
                WHERE c.client_id = ?
                GROUP BY c.id, cl.name ORDER BY c.start_date DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$clientId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function updateStatus($id, $status) {
        $sql = "UPDATE contracts SET status = ? WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$status, $id]);
    }
    
    public function getRemainingHours($contractId) {
        $contract = $this->getById($contractId);
        return $contract ? $contract['remaining_hours'] : 0;
    }
    
    public function canDeductHours($contractId, $hours) {
        $remainingHours = $this->getRemainingHours($contractId);
        return $remainingHours >= $hours;
    }
    
    public function getHourlyRate($contractId) {
        $sql = "SELECT hourly_rate FROM contracts WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$contractId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $result['hourly_rate'] : 0;
    }
    
    public function generateContractNumber() {
        $year = date('Y');
        $sql = "SELECT COUNT(*) + 1 as next_number FROM contracts WHERE strftime('%Y', created_at) = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$year]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return "CONT-{$year}-" . str_pad($result['next_number'], 4, '0', STR_PAD_LEFT);
    }
}