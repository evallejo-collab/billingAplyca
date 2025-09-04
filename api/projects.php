<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../controllers/ProjectController.php';

$controller = new ProjectController();
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            if (isset($_GET['summary'])) {
                $response = $controller->getProjectSummary($_GET['id']);
            } else {
                $response = $controller->getProject($_GET['id']);
            }
        } elseif (isset($_GET['contract_id'])) {
            if (isset($_GET['active_only'])) {
                $response = $controller->getActiveProjectsForContract($_GET['contract_id']);
            } else {
                $response = $controller->getProjectsByContract($_GET['contract_id']);
            }
        } else {
            $status = $_GET['status'] ?? null;
            $independent = isset($_GET['independent']) ? (bool)$_GET['independent'] : null;
            $response = $controller->getAllProjects($status, $independent);
        }
        break;
        
    case 'POST':
        $response = $controller->createProject($input);
        break;
        
    case 'PUT':
        if (isset($_GET['id'])) {
            if (isset($input['status']) && !isset($input['name'])) {
                $response = $controller->updateProjectStatus($_GET['id'], $input['status']);
            } else {
                $response = $controller->updateProject($_GET['id'], $input);
            }
        } else {
            $response = [
                'success' => false,
                'message' => 'ID de proyecto requerido para actualización'
            ];
        }
        break;
        
    case 'DELETE':
        if (isset($_GET['id'])) {
            $response = $controller->deleteProject($_GET['id']);
        } else {
            $response = [
                'success' => false,
                'message' => 'ID de proyecto requerido para eliminación'
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