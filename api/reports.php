<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../reports/BillingReports.php';

$reports = new BillingReports();
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'overview':
            $stats = $reports->getOverviewStats();
            echo json_encode([
                'success' => true,
                'stats' => $stats
            ]);
            break;
            
        case 'monthly':
            $year = $_GET['year'] ?? date('Y');
            $month = $_GET['month'] ?? date('n');
            $data = $reports->getMonthlyBillingReport($year, $month);
            echo json_encode([
                'success' => true,
                'data' => $data,
                'period' => [
                    'year' => $year,
                    'month' => $month
                ]
            ]);
            break;
            
        case 'client':
            $clientId = $_GET['client_id'] ?? null;
            $startDate = $_GET['start_date'] ?? null;
            $endDate = $_GET['end_date'] ?? null;
            
            if (!$clientId) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Client ID requerido'
                ]);
                break;
            }
            
            $data = $reports->getClientBillingReport($clientId, $startDate, $endDate);
            echo json_encode([
                'success' => true,
                'data' => $data
            ]);
            break;
            
        case 'active_contracts':
            $data = $reports->getActiveContractsReport();
            echo json_encode([
                'success' => true,
                'data' => $data
            ]);
            break;
            
        case 'time_entries':
            $startDate = $_GET['start_date'] ?? date('Y-m-01');
            $endDate = $_GET['end_date'] ?? date('Y-m-t');
            $contractId = $_GET['contract_id'] ?? null;
            
            $data = $reports->getTimeEntriesReport($startDate, $endDate, $contractId);
            echo json_encode([
                'success' => true,
                'data' => $data,
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ]
            ]);
            break;
            
        default:
            echo json_encode([
                'success' => false,
                'message' => 'Acción no especificada o inválida'
            ]);
            break;
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}