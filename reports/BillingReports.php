<?php

require_once __DIR__ . '/../config/database.php';

class BillingReports {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }
    
    public function getContractSummaryReport($contractId = null) {
        $sql = "SELECT * FROM contract_summary";
        $params = [];
        
        if ($contractId) {
            $sql .= " WHERE id = ?";
            $params[] = $contractId;
        }
        
        $sql .= " ORDER BY start_date DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getMonthlyBillingReport($year, $month) {
        $sql = "SELECT 
                    cl.name as client_name,
                    c.contract_number,
                    c.description as contract_description,
                    SUM(te.hours_used) as total_hours_used,
                    c.hourly_rate,
                    SUM(te.hours_used * c.hourly_rate) as total_amount,
                    COUNT(te.id) as entries_count
                FROM time_entries te
                JOIN contracts c ON te.contract_id = c.id
                JOIN clients cl ON c.client_id = cl.id
                WHERE strftime('%Y', te.entry_date) = ? AND strftime('%m', te.entry_date) = ?
                GROUP BY c.id, cl.name, c.contract_number, c.description, c.hourly_rate
                ORDER BY cl.name, c.contract_number";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$year, sprintf('%02d', $month)]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getClientBillingReport($clientId, $startDate = null, $endDate = null) {
        $sql = "SELECT 
                    cl.name as client_name,
                    c.contract_number,
                    c.description as contract_description,
                    c.total_hours,
                    COALESCE(SUM(te.hours_used), 0) as used_hours,
                    (c.total_hours - COALESCE(SUM(te.hours_used), 0)) as remaining_hours,
                    c.hourly_rate,
                    c.total_amount as contract_value,
                    COALESCE(SUM(te.hours_used * c.hourly_rate), 0) as billed_amount,
                    c.status,
                    c.start_date,
                    c.end_date
                FROM contracts c
                JOIN clients cl ON c.client_id = cl.id
                LEFT JOIN time_entries te ON c.id = te.contract_id";
        
        $params = [$clientId];
        $conditions = ["c.client_id = ?"];
        
        if ($startDate && $endDate) {
            $conditions[] = "te.entry_date BETWEEN ? AND ?";
            $params[] = $startDate;
            $params[] = $endDate;
        }
        
        $sql .= " WHERE " . implode(" AND ", $conditions);
        $sql .= " GROUP BY c.id, cl.name ORDER BY c.start_date DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getTimeEntriesReport($startDate, $endDate, $contractId = null) {
        $sql = "SELECT 
                    te.entry_date,
                    te.description,
                    te.hours_used,
                    te.created_by,
                    te.notes,
                    cl.name as client_name,
                    c.contract_number,
                    c.hourly_rate,
                    (te.hours_used * c.hourly_rate) as amount
                FROM time_entries te
                JOIN contracts c ON te.contract_id = c.id
                JOIN clients cl ON c.client_id = cl.id
                WHERE te.entry_date BETWEEN ? AND ?";
        
        $params = [$startDate, $endDate];
        
        if ($contractId) {
            $sql .= " AND te.contract_id = ?";
            $params[] = $contractId;
        }
        
        $sql .= " ORDER BY te.entry_date DESC, cl.name, c.contract_number";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getActiveContractsReport() {
        $sql = "SELECT 
                    cl.name as client_name,
                    c.contract_number,
                    c.description,
                    c.total_hours,
                    COALESCE(SUM(te.hours_used), 0) as used_hours,
                    (c.total_hours - COALESCE(SUM(te.hours_used), 0)) as remaining_hours,
                    ROUND(((COALESCE(SUM(te.hours_used), 0) / c.total_hours) * 100), 2) as completion_percentage,
                    c.hourly_rate,
                    COALESCE(SUM(te.hours_used * c.hourly_rate), 0) as billed_amount,
                    (c.total_hours * c.hourly_rate) as contract_value,
                    c.start_date,
                    c.end_date
                FROM contracts c
                JOIN clients cl ON c.client_id = cl.id
                LEFT JOIN time_entries te ON c.id = te.contract_id
                WHERE c.status = 'active'
                GROUP BY c.id, cl.name
                ORDER BY completion_percentage DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getOverviewStats() {
        $sql = "SELECT 
                    COUNT(DISTINCT c.id) as total_contracts,
                    COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_contracts,
                    COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_contracts,
                    SUM(c.total_hours) as total_contracted_hours,
                    SUM(COALESCE(te_sum.total_used, 0)) as total_used_hours,
                    SUM(c.total_amount) as total_contract_value,
                    SUM(COALESCE(te_sum.total_billed, 0)) as total_billed_amount
                FROM contracts c
                LEFT JOIN (
                    SELECT 
                        contract_id,
                        SUM(hours_used) as total_used,
                        SUM(hours_used * (SELECT hourly_rate FROM contracts WHERE id = contract_id)) as total_billed
                    FROM time_entries
                    GROUP BY contract_id
                ) te_sum ON c.id = te_sum.contract_id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function exportToCSV($data, $filename) {
        $output = fopen('php://temp', 'w');
        
        if (!empty($data)) {
            fputcsv($output, array_keys($data[0]));
            
            foreach ($data as $row) {
                fputcsv($output, $row);
            }
        }
        
        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);
        
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . strlen($csv));
        
        echo $csv;
    }
}