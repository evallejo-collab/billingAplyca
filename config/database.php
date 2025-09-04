<?php

class Database {
    private $db_path;
    private $conn;
    
    public function __construct() {
        $this->db_path = __DIR__ . '/../database/billing_system.db';
    }
    
    public function getConnection() {
        $this->conn = null;
        
        try {
            $this->conn = new PDO("sqlite:" . $this->db_path);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch(PDOException $exception) {
            echo "Error de conexión: " . $exception->getMessage();
        }
        
        return $this->conn;
    }
}