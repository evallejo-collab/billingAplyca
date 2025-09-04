<?php

require_once 'controllers/ContractController.php';

echo "🧪 Probando el Sistema de Facturación\n";
echo "=====================================\n\n";

$controller = new ContractController();

// Probar obtener todos los contratos
echo "📋 1. Obteniendo todos los contratos:\n";
$result = $controller->getAllContracts();
if ($result['success']) {
    echo "✅ Contratos encontrados: " . count($result['contracts']) . "\n";
    foreach ($result['contracts'] as $contract) {
        echo "   - {$contract['contract_number']}: {$contract['client_name']}\n";
        echo "     Horas: {$contract['used_hours']}/{$contract['total_hours']} (Restantes: {$contract['remaining_hours']})\n";
        echo "     Facturado: $" . number_format($contract['billed_amount'], 2) . "\n\n";
    }
} else {
    echo "❌ Error: " . $result['message'] . "\n\n";
}

// Probar crear un nuevo contrato
echo "📝 2. Creando un nuevo contrato:\n";
$newContract = [
    'client_id' => 1,
    'description' => 'Proyecto de prueba desde PHP',
    'total_hours' => 50.0,
    'hourly_rate' => 90.00,
    'start_date' => date('Y-m-d'),
    'created_by' => 'Sistema de Prueba'
];

$result = $controller->createContract($newContract);
if ($result['success']) {
    echo "✅ Contrato creado: " . $result['contract_number'] . "\n\n";
} else {
    echo "❌ Error: " . $result['message'] . "\n\n";
}

// Probar registrar horas
echo "⏰ 3. Registrando horas de trabajo:\n";
$timeEntry = [
    'contract_id' => 1,
    'description' => 'Trabajo de prueba desde PHP',
    'hours_used' => 5.5,
    'entry_date' => date('Y-m-d'),
    'created_by' => 'Sistema de Prueba'
];

$result = $controller->addTimeEntry($timeEntry);
if ($result['success']) {
    echo "✅ Horas registradas. Horas restantes: " . $result['remaining_hours'] . "\n\n";
} else {
    echo "❌ Error: " . $result['message'] . "\n\n";
}

// Probar obtener contratos activos
echo "🟢 4. Obteniendo contratos activos:\n";
$result = $controller->getAllContracts('active');
if ($result['success']) {
    echo "✅ Contratos activos: " . count($result['contracts']) . "\n";
    foreach ($result['contracts'] as $contract) {
        $percentage = round(($contract['used_hours'] / $contract['total_hours']) * 100, 1);
        echo "   - {$contract['contract_number']}: {$percentage}% completado\n";
    }
    echo "\n";
} else {
    echo "❌ Error: " . $result['message'] . "\n\n";
}

// Probar validación de horas
echo "⚠️  5. Probando validación de horas (intentar exceder límite):\n";
$invalidTimeEntry = [
    'contract_id' => 3, // Contrato con pocas horas restantes
    'description' => 'Intento de exceder horas',
    'hours_used' => 999.0,
    'entry_date' => date('Y-m-d'),
    'created_by' => 'Sistema de Prueba'
];

$result = $controller->addTimeEntry($invalidTimeEntry);
if ($result['success']) {
    echo "❌ PROBLEMA: Se permitió exceder las horas!\n\n";
} else {
    echo "✅ Validación correcta: " . $result['message'] . "\n\n";
}

echo "🏁 Pruebas completadas!\n";