<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../models/TimeEntry.php';
require_once __DIR__ . '/../config/database.php';

$database = new Database();
$db = $database->getConnection();
$timeEntry = new TimeEntry($db);

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        try {
            if (isset($_GET['contract_id'])) {
                $entries = $timeEntry->getByContract($_GET['contract_id']);
            } elseif (isset($_GET['start_date']) && isset($_GET['end_date'])) {
                $contractId = $_GET['contract_id'] ?? null;
                $entries = $timeEntry->getByDateRange($_GET['start_date'], $_GET['end_date'], $contractId);
            } else {
                // Get recent entries
                $sql = "SELECT te.*, c.contract_number, cl.name as client_name, c.hourly_rate,
                               (te.hours_used * c.hourly_rate) as amount
                        FROM time_entries te
                        JOIN contracts c ON te.contract_id = c.id
                        JOIN clients cl ON c.client_id = cl.id
                        ORDER BY te.entry_date DESC, te.created_at DESC
                        LIMIT 50";
                $stmt = $db->prepare($sql);
                $stmt->execute();
                $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            
            echo json_encode([
                'success' => true,
                'entries' => $entries
            ]);
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ]);
        }
        break;
        
    default:
        echo json_encode([
            'success' => false,
            'message' => 'Método no soportado'
        ]);
        break;
}