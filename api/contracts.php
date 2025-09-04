<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../controllers/ContractController.php';

$controller = new ContractController();
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            $response = $controller->getContract($_GET['id']);
        } elseif (isset($_GET['client_id'])) {
            $response = $controller->getContractsByClient($_GET['client_id']);
        } else {
            $status = $_GET['status'] ?? null;
            $response = $controller->getAllContracts($status);
        }
        break;
        
    case 'POST':
        if (isset($input['action']) && $input['action'] === 'add_time_entry') {
            $response = $controller->addTimeEntry($input);
        } else {
            $response = $controller->createContract($input);
        }
        break;
        
    case 'PUT':
        if (isset($_GET['id']) && isset($input['status'])) {
            $response = $controller->updateContractStatus($_GET['id'], $input['status']);
        } else {
            $response = [
                'success' => false,
                'message' => 'Parámetros inválidos para actualización'
            ];
        }
        break;
        
    default:
        $response = [
            'success' => false,
            'message' => 'Método no soportado'
        ];
        break;
}

echo json_encode($response);