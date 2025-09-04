<?php

require_once __DIR__ . '/../models/Project.php';
require_once __DIR__ . '/../config/database.php';

class ProjectController {
    private $project;
    
    public function __construct() {
        $database = new Database();
        $db = $database->getConnection();
        $this->project = new Project($db);
    }
    
    public function createProject($data) {
        try {
            // Validar datos requeridos
            if (empty($data['name'])) {
                return [
                    'success' => false,
                    'message' => 'El nombre del proyecto es requerido'
                ];
            }

            // Determinar si es proyecto independiente
            $isIndependent = isset($data['is_independent']) && $data['is_independent'];
            
            $result = $this->project->create(
                $data['name'],
                $data['description'] ?? null,
                $data['estimated_hours'] ?? null,
                $data['start_date'] ?? null,
                $data['end_date'] ?? null,
                $data['contract_id'] ?? null,
                $data['independent_client_id'] ?? null,
                $data['client_name'] ?? null,
                $data['client_email'] ?? null,
                $data['client_phone'] ?? null,
                $data['hourly_rate'] ?? null,
                $data['total_amount'] ?? null,
                $isIndependent
            );
            
            if ($result) {
                return [
                    'success' => true,
                    'message' => 'Proyecto creado exitosamente'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Error al crear el proyecto'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ];
        }
    }
    
    public function getProject($id) {
        try {
            $project = $this->project->getById($id);
            if ($project) {
                return [
                    'success' => true,
                    'project' => $project
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Proyecto no encontrado'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ];
        }
    }
    
    public function getAllProjects($status = null, $independent = null) {
        try {
            if ($independent !== null) {
                if ($independent) {
                    $projects = $this->project->getIndependentProjects($status);
                } else {
                    // Get contract projects
                    $projects = $this->project->getAll($status);
                    // Filter out independent projects
                    $projects = array_filter($projects, function($project) {
                        return !$project['is_independent'];
                    });
                }
            } else {
                $projects = $this->project->getAll($status);
                // Also get independent projects
                $independentProjects = $this->project->getIndependentProjects($status);
                $projects = array_merge($projects, $independentProjects);
            }
            
            return [
                'success' => true,
                'projects' => $projects
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ];
        }
    }
    
    public function getProjectsByContract($contractId) {
        try {
            $projects = $this->project->getByContract($contractId);
            return [
                'success' => true,
                'projects' => $projects
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ];
        }
    }
    
    public function updateProject($id, $data) {
        try {
            // Check if this is a status-only update
            if (isset($data['status']) && count($data) == 1) {
                return $this->updateProjectStatus($id, $data['status']);
            }
            
            // Check if this is a payment status update
            if (isset($data['action']) && $data['action'] === 'update_payment') {
                return $this->updatePaymentStatus($id, $data);
            }
            
            $result = $this->project->update(
                $id,
                $data['name'],
                $data['description'] ?? null,
                $data['estimated_hours'] ?? null,
                $data['start_date'] ?? null,
                $data['end_date'] ?? null
            );
            
            if ($result) {
                return [
                    'success' => true,
                    'message' => 'Proyecto actualizado exitosamente'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Error al actualizar el proyecto'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ];
        }
    }
    
    public function updateProjectStatus($id, $status) {
        try {
            $validStatuses = ['active', 'completed', 'on_hold', 'cancelled'];
            if (!in_array($status, $validStatuses)) {
                return [
                    'success' => false,
                    'message' => 'Estado inválido'
                ];
            }
            
            $result = $this->project->updateStatus($id, $status);
            if ($result) {
                return [
                    'success' => true,
                    'message' => 'Estado del proyecto actualizado'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Error al actualizar el estado'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ];
        }
    }
    
    public function deleteProject($id) {
        try {
            $result = $this->project->delete($id);
            if ($result) {
                return [
                    'success' => true,
                    'message' => 'Proyecto eliminado exitosamente'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Error al eliminar el proyecto'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ];
        }
    }
    
    public function getProjectSummary($id) {
        try {
            $summary = $this->project->getProjectSummary($id);
            if ($summary) {
                return [
                    'success' => true,
                    'summary' => $summary
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Proyecto no encontrado'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ];
        }
    }
    
    public function getActiveProjectsForContract($contractId) {
        try {
            $projects = $this->project->getActiveProjectsForContract($contractId);
            return [
                'success' => true,
                'projects' => $projects
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ];
        }
    }
    
    public function updatePaymentStatus($id, $data) {
        try {
            $result = $this->project->updatePaymentStatus(
                $id,
                $data['is_paid'] ?? false,
                $data['payment_date'] ?? null,
                $data['payment_method'] ?? null,
                $data['invoice_number'] ?? null
            );
            
            if ($result) {
                return [
                    'success' => true,
                    'message' => 'Estado de pago actualizado exitosamente'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Error al actualizar el estado de pago'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ];
        }
    }
}