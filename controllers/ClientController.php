<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Client.php';

class ClientController {
    private $client;
    
    public function __construct() {
        $database = new Database();
        $db = $database->getConnection();
        $this->client = new Client($db);
    }
    
    public function getAllClients() {
        try {
            $clients = $this->client->getAll();
            
            // Formatear valores para COP
            foreach ($clients as &$client) {
                $client['total_contract_value'] = $this->formatCOP($client['total_contract_value']);
                $client['total_project_value'] = $this->formatCOP($client['total_project_value']);
                $client['total_value'] = $this->formatCOP($client['total_value']);
            }
            
            return [
                'success' => true,
                'clients' => $clients
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    public function getClient($id) {
        try {
            $client = $this->client->getById($id);
            
            if (!$client) {
                return [
                    'success' => false,
                    'message' => 'Cliente no encontrado'
                ];
            }
            
            return [
                'success' => true,
                'client' => $client
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    public function getClientSummary($id) {
        try {
            $client = $this->client->getClientSummary($id);
            
            if (!$client) {
                return [
                    'success' => false,
                    'message' => 'Cliente no encontrado'
                ];
            }
            
            // Formatear valores para COP
            $client['total_contract_value'] = $this->formatCOP($client['total_contract_value']);
            $client['total_project_value'] = $this->formatCOP($client['total_project_value']);
            $client['total_contract_billed'] = $this->formatCOP($client['total_contract_billed']);
            $client['total_project_billed'] = $this->formatCOP($client['total_project_billed']);
            
            return [
                'success' => true,
                'client' => $client
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    public function getClientContracts($id) {
        try {
            $contracts = $this->client->getClientContracts($id);
            
            // Formatear valores para COP
            foreach ($contracts as &$contract) {
                $contract['hourly_rate'] = $this->formatCOP($contract['hourly_rate']);
                $contract['total_amount'] = $this->formatCOP($contract['total_amount']);
                $contract['billed_amount'] = $this->formatCOP($contract['billed_amount']);
            }
            
            return [
                'success' => true,
                'contracts' => $contracts
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    public function getClientProjects($id) {
        try {
            $projects = $this->client->getClientProjects($id);
            
            // Formatear valores para COP
            foreach ($projects as &$project) {
                if (isset($project['hourly_rate'])) {
                    $project['hourly_rate'] = $this->formatCOP($project['hourly_rate']);
                }
                if (isset($project['total_amount'])) {
                    $project['total_amount'] = $this->formatCOP($project['total_amount']);
                }
                if (isset($project['current_cost'])) {
                    $project['current_cost'] = $this->formatCOP($project['current_cost']);
                }
            }
            
            return [
                'success' => true,
                'projects' => $projects
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    public function createClient($data) {
        try {
            // Validar datos requeridos
            if (empty($data['name']) || empty($data['email'])) {
                return [
                    'success' => false,
                    'message' => 'Nombre y email son requeridos'
                ];
            }
            
            // Validar formato de email
            if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                return [
                    'success' => false,
                    'message' => 'Formato de email inválido'
                ];
            }
            
            $result = $this->client->create(
                $data['name'],
                $data['email'],
                $data['phone'] ?? null,
                $data['address'] ?? null,
                $data['company'] ?? null,
                $data['tax_id'] ?? null,
                $data['contact_person'] ?? null
            );
            
            if ($result) {
                return [
                    'success' => true,
                    'message' => 'Cliente creado exitosamente'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Error al crear el cliente'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    public function updateClient($id, $data) {
        try {
            // Validar datos requeridos
            if (empty($data['name']) || empty($data['email'])) {
                return [
                    'success' => false,
                    'message' => 'Nombre y email son requeridos'
                ];
            }
            
            // Validar formato de email
            if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                return [
                    'success' => false,
                    'message' => 'Formato de email inválido'
                ];
            }
            
            $result = $this->client->update(
                $id,
                $data['name'],
                $data['email'],
                $data['phone'] ?? null,
                $data['address'] ?? null,
                $data['company'] ?? null,
                $data['tax_id'] ?? null,
                $data['contact_person'] ?? null
            );
            
            if ($result) {
                return [
                    'success' => true,
                    'message' => 'Cliente actualizado exitosamente'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Error al actualizar el cliente'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    public function deleteClient($id) {
        try {
            $result = $this->client->delete($id);
            
            if ($result) {
                return [
                    'success' => true,
                    'message' => 'Cliente eliminado exitosamente'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Error al eliminar el cliente'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    public function searchClients($searchTerm) {
        try {
            $clients = $this->client->searchClients($searchTerm);
            
            return [
                'success' => true,
                'clients' => $clients
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    private function formatCOP($amount) {
        return number_format($amount, 0, ',', '.');
    }
}