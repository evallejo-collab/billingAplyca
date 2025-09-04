<?php

class HourCategory {
    private $db;
    
    public function __construct($database) {
        $this->db = $database;
    }
    
    public function getAll($activeOnly = true) {
        $sql = "SELECT * FROM hour_categories";
        $params = [];
        
        if ($activeOnly) {
            $sql .= " WHERE is_active = 1";
        }
        
        $sql .= " ORDER BY name";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getById($id) {
        $sql = "SELECT * FROM hour_categories WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function create($name, $description = null, $color = '#3B82F6') {
        $sql = "INSERT INTO hour_categories (name, description, color) VALUES (?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$name, $description, $color]);
    }
    
    public function update($id, $name, $description = null, $color = null) {
        $sql = "UPDATE hour_categories SET name = ?, description = ?";
        $params = [$name, $description];
        
        if ($color) {
            $sql .= ", color = ?";
            $params[] = $color;
        }
        
        $sql .= " WHERE id = ?";
        $params[] = $id;
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }
    
    public function toggleActive($id) {
        $sql = "UPDATE hour_categories SET is_active = NOT is_active WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$id]);
    }
    
    public function getCategoryUsageStats() {
        $sql = "SELECT 
                    hc.id, hc.name, hc.color,
                    COUNT(te.id) as entries_count,
                    COALESCE(SUM(te.hours_used), 0) as total_hours,
                    COALESCE(SUM(te.hours_used * c.hourly_rate), 0) as total_amount
                FROM hour_categories hc
                LEFT JOIN time_entries te ON hc.id = te.category_id
                LEFT JOIN contracts c ON te.contract_id = c.id
                WHERE hc.is_active = 1
                GROUP BY hc.id, hc.name, hc.color
                ORDER BY total_hours DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getCategoryUsageByContract($contractId) {
        $sql = "SELECT 
                    hc.id, hc.name, hc.color,
                    COUNT(te.id) as entries_count,
                    COALESCE(SUM(te.hours_used), 0) as total_hours,
                    COALESCE(SUM(te.hours_used * c.hourly_rate), 0) as total_amount
                FROM hour_categories hc
                LEFT JOIN time_entries te ON hc.id = te.category_id AND te.contract_id = ?
                LEFT JOIN contracts c ON te.contract_id = c.id
                WHERE hc.is_active = 1
                GROUP BY hc.id, hc.name, hc.color
                HAVING entries_count > 0
                ORDER BY total_hours DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$contractId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getMonthlyUsageByCategory($year, $month) {
        $sql = "SELECT 
                    hc.id, hc.name, hc.color,
                    cl.name as client_name,
                    c.contract_number,
                    COUNT(te.id) as entries_count,
                    COALESCE(SUM(te.hours_used), 0) as total_hours,
                    COALESCE(SUM(te.hours_used * c.hourly_rate), 0) as total_amount
                FROM hour_categories hc
                JOIN time_entries te ON hc.id = te.category_id
                JOIN contracts c ON te.contract_id = c.id
                JOIN clients cl ON c.client_id = cl.id
                WHERE strftime('%Y', te.entry_date) = ? AND strftime('%m', te.entry_date) = ?
                GROUP BY hc.id, hc.name, cl.name, c.contract_number
                ORDER BY hc.name, cl.name";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$year, sprintf('%02d', $month)]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}