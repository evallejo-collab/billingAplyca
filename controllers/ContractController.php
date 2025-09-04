<?php

require_once __DIR__ . '/../models/Contract.php';
require_once __DIR__ . '/../models/TimeEntry.php';
require_once __DIR__ . '/../config/database.php';

class ContractController {
    private $contract;
    private $timeEntry;
    
    public function __construct() {
        $database = new Database();
        $db = $database->getConnection();
        $this->contract = new Contract($db);
        $this->timeEntry = new TimeEntry($db);
    }
    
    public function createContract($data) {
        try {
            if (empty($data['contract_number'])) {
                $data['contract_number'] = $this->contract->generateContractNumber();
            }
            
            $result = $this->contract->create(
                $data['client_id'],
                $data['contract_number'],
                $data['description'],
                $data['total_hours'],
                $data['hourly_rate'],
                $data['start_date'],
                $data['end_date'] ?? null
            );
            
            if ($result) {
                return [
                    'success' => true,
                    'message' => 'Contrato creado exitosamente',
                    'contract_number' => $data['contract_number']
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Error al crear el contrato'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ];
        }
    }
    
    public function getContract($id) {
        try {
            $contract = $this->contract->getById($id);
            if ($contract) {
                $timeEntries = $this->timeEntry->getByContract($id);
                $contract['time_entries'] = $timeEntries;
                
                return [
                    'success' => true,
                    'contract' => $contract
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Contrato no encontrado'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ];
        }
    }
    
    public function getAllContracts($status = null) {
        try {
            $contracts = $this->contract->getAll($status);
            return [
                'success' => true,
                'contracts' => $contracts
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ];
        }
    }
    
    public function addTimeEntry($data) {
        try {
            $result = $this->timeEntry->create(
                $data['contract_id'],
                $data['description'],
                $data['hours_used'],
                $data['entry_date'],
                $data['created_by'] ?? null,
                $data['notes'] ?? null,
                $data['category_id'] ?? 1,
                $data['project_id'] ?? null
            );
            
            if ($result) {
                $contract = $this->contract->getById($data['contract_id']);
                return [
                    'success' => true,
                    'message' => 'Horas registradas exitosamente',
                    'remaining_hours' => $contract['remaining_hours']
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Error al registrar las horas'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ];
        }
    }
    
    public function updateContractStatus($id, $status) {
        try {
            $validStatuses = ['active', 'completed', 'cancelled'];
            if (!in_array($status, $validStatuses)) {
                return [
                    'success' => false,
                    'message' => 'Estado inválido'
                ];
            }
            
            $result = $this->contract->updateStatus($id, $status);
            if ($result) {
                return [
                    'success' => true,
                    'message' => 'Estado del contrato actualizado'
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
    
    public function getContractsByClient($clientId) {
        try {
            $contracts = $this->contract->getByClient($clientId);
            return [
                'success' => true,
                'contracts' => $contracts
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ];
        }
    }
}