<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../models/HourCategory.php';
require_once __DIR__ . '/../config/database.php';

$database = new Database();
$db = $database->getConnection();
$category = new HourCategory($db);

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['stats'])) {
                if (isset($_GET['contract_id'])) {
                    $data = $category->getCategoryUsageByContract($_GET['contract_id']);
                } elseif (isset($_GET['year']) && isset($_GET['month'])) {
                    $data = $category->getMonthlyUsageByCategory($_GET['year'], $_GET['month']);
                } else {
                    $data = $category->getCategoryUsageStats();
                }
                $response = [
                    'success' => true,
                    'data' => $data
                ];
            } elseif (isset($_GET['id'])) {
                $data = $category->getById($_GET['id']);
                $response = [
                    'success' => true,
                    'category' => $data
                ];
            } else {
                $activeOnly = !isset($_GET['include_inactive']);
                $data = $category->getAll($activeOnly);
                $response = [
                    'success' => true,
                    'categories' => $data
                ];
            }
            break;
            
        case 'POST':
            $result = $category->create(
                $input['name'],
                $input['description'] ?? null,
                $input['color'] ?? '#3B82F6'
            );
            
            if ($result) {
                $response = [
                    'success' => true,
                    'message' => 'Categoría creada exitosamente'
                ];
            } else {
                $response = [
                    'success' => false,
                    'message' => 'Error al crear la categoría'
                ];
            }
            break;
            
        case 'PUT':
            if (isset($_GET['id'])) {
                if (isset($input['toggle_active'])) {
                    $result = $category->toggleActive($_GET['id']);
                    $message = 'Estado de categoría actualizado';
                } else {
                    $result = $category->update(
                        $_GET['id'],
                        $input['name'],
                        $input['description'] ?? null,
                        $input['color'] ?? null
                    );
                    $message = 'Categoría actualizada exitosamente';
                }
                
                if ($result) {
                    $response = [
                        'success' => true,
                        'message' => $message
                    ];
                } else {
                    $response = [
                        'success' => false,
                        'message' => 'Error al actualizar la categoría'
                    ];
                }
            } else {
                $response = [
                    'success' => false,
                    'message' => 'ID de categoría requerido'
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
} catch (Exception $e) {
    $response = [
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ];
}

echo json_encode($response);