<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../controllers/ClientController.php';

$controller = new ClientController();
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            if (isset($_GET['summary'])) {
                $response = $controller->getClientSummary($_GET['id']);
            } elseif (isset($_GET['contracts'])) {
                $response = $controller->getClientContracts($_GET['id']);
            } elseif (isset($_GET['projects'])) {
                $response = $controller->getClientProjects($_GET['id']);
            } else {
                $response = $controller->getClient($_GET['id']);
            }
        } elseif (isset($_GET['search'])) {
            $response = $controller->searchClients($_GET['search']);
        } else {
            $response = $controller->getAllClients();
        }
        break;
        
    case 'POST':
        $response = $controller->createClient($input);
        break;
        
    case 'PUT':
        if (isset($_GET['id'])) {
            $response = $controller->updateClient($_GET['id'], $input);
        } else {
            $response = [
                'success' => false,
                'message' => 'ID de cliente requerido para actualización'
            ];
        }
        break;
        
    case 'DELETE':
        if (isset($_GET['id'])) {
            $response = $controller->deleteClient($_GET['id']);
        } else {
            $response = [
                'success' => false,
                'message' => 'ID de cliente requerido para eliminación'
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