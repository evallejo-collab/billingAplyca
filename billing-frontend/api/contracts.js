// Vercel API Route for Contracts
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const getDataPath = () => join(process.cwd(), 'data', 'contracts.json');
const getClientsPath = () => join(process.cwd(), 'data', 'clients.json');
const getTimeEntriesPath = () => join(process.cwd(), 'data', 'time_entries.json');

const readContracts = () => {
  try {
    const data = readFileSync(getDataPath(), 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const readClients = () => {
  try {
    const data = readFileSync(getClientsPath(), 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const readTimeEntries = () => {
  try {
    const data = readFileSync(getTimeEntriesPath(), 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeContracts = (contracts) => {
  try {
    writeFileSync(getDataPath(), JSON.stringify(contracts, null, 2));
  } catch (error) {
    console.error('Error writing contracts:', error);
  }
};

const writeTimeEntries = (timeEntries) => {
  try {
    writeFileSync(getTimeEntriesPath(), JSON.stringify(timeEntries, null, 2));
  } catch (error) {
    console.error('Error writing time entries:', error);
  }
};

export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { method, query, body } = req;

  try {
    switch (method) {
      case 'GET':
        if (query.id) {
          return handleGetContract(req, res);
        } else if (query.client_id) {
          return handleGetContractsByClient(req, res);
        } else {
          return handleGetAllContracts(req, res);
        }

      case 'POST':
        if (body.action === 'add_time_entry') {
          return handleAddTimeEntry(req, res);
        } else {
          return handleCreateContract(req, res);
        }

      case 'PUT':
        if (query.id) {
          return handleUpdateContract(req, res);
        } else {
          return res.status(400).json({
            success: false,
            message: 'ID de contrato requerido para actualización'
          });
        }

      case 'DELETE':
        if (query.id) {
          return handleDeleteContract(req, res);
        } else {
          return res.status(400).json({
            success: false,
            message: 'ID de contrato requerido para eliminación'
          });
        }

      default:
        return res.status(405).json({
          success: false,
          message: 'Método no soportado'
        });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

function calculateContractStats(contract, timeEntries) {
  const contractEntries = timeEntries.filter(entry => entry.contract_id === contract.id);
  const usedHours = contractEntries.reduce((sum, entry) => sum + (entry.hours_used || 0), 0);
  const remainingHours = Math.max(0, contract.total_hours - usedHours);
  const billedAmount = usedHours * contract.hourly_rate;
  const remainingAmount = remainingHours * contract.hourly_rate;

  return {
    ...contract,
    used_hours: usedHours,
    remaining_hours: remainingHours,
    billed_amount: billedAmount,
    remaining_amount: remainingAmount,
    entries_count: contractEntries.length
  };
}

function handleGetAllContracts(req, res) {
  const contracts = readContracts();
  const clients = readClients();
  const timeEntries = readTimeEntries();
  const { status } = req.query;

  let filteredContracts = contracts;
  if (status) {
    filteredContracts = contracts.filter(contract => contract.status === status);
  }

  const contractsWithStats = filteredContracts.map(contract => {
    const client = clients.find(c => c.id === contract.client_id);
    const contractWithStats = calculateContractStats(contract, timeEntries);
    
    return {
      ...contractWithStats,
      client_name: client ? client.name : 'Cliente no encontrado'
    };
  });

  return res.status(200).json({
    success: true,
    contracts: contractsWithStats
  });
}

function handleGetContract(req, res) {
  const { id } = req.query;
  const contracts = readContracts();
  const clients = readClients();
  const timeEntries = readTimeEntries();
  
  const contract = contracts.find(c => c.id === parseInt(id));

  if (!contract) {
    return res.status(404).json({
      success: false,
      message: 'Contrato no encontrado'
    });
  }

  const client = clients.find(c => c.id === contract.client_id);
  const contractWithStats = calculateContractStats(contract, timeEntries);

  return res.status(200).json({
    success: true,
    contract: {
      ...contractWithStats,
      client_name: client ? client.name : 'Cliente no encontrado'
    }
  });
}

function handleGetContractsByClient(req, res) {
  const { client_id } = req.query;
  const contracts = readContracts();
  const timeEntries = readTimeEntries();
  
  const clientContracts = contracts.filter(c => c.client_id === parseInt(client_id));
  const contractsWithStats = clientContracts.map(contract => 
    calculateContractStats(contract, timeEntries)
  );

  return res.status(200).json({
    success: true,
    contracts: contractsWithStats
  });
}

function handleCreateContract(req, res) {
  const contracts = readContracts();
  
  const newContract = {
    id: Math.max(...contracts.map(c => c.id), 0) + 1,
    client_id: parseInt(req.body.client_id),
    contract_number: req.body.contract_number,
    description: req.body.description,
    total_hours: parseFloat(req.body.total_hours),
    hourly_rate: parseFloat(req.body.hourly_rate),
    total_amount: parseFloat(req.body.total_hours) * parseFloat(req.body.hourly_rate),
    start_date: req.body.start_date,
    end_date: req.body.end_date || null,
    status: req.body.status || 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Basic validation
  if (!newContract.client_id || !newContract.contract_number || !newContract.total_hours || !newContract.hourly_rate) {
    return res.status(400).json({
      success: false,
      message: 'Campos requeridos: client_id, contract_number, total_hours, hourly_rate'
    });
  }

  contracts.push(newContract);
  writeContracts(contracts);

  return res.status(201).json({
    success: true,
    message: 'Contrato creado exitosamente',
    contract: newContract
  });
}

function handleUpdateContract(req, res) {
  const { id } = req.query;
  const contracts = readContracts();
  const contractIndex = contracts.findIndex(c => c.id === parseInt(id));

  if (contractIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Contrato no encontrado'
    });
  }

  // If it's just a status update
  if (req.body.status && Object.keys(req.body).length === 1) {
    contracts[contractIndex].status = req.body.status;
    contracts[contractIndex].updated_at = new Date().toISOString();
    
    writeContracts(contracts);
    
    return res.status(200).json({
      success: true,
      message: 'Estado del contrato actualizado exitosamente'
    });
  }

  // Full update
  const updatedContract = {
    ...contracts[contractIndex],
    description: req.body.description || contracts[contractIndex].description,
    total_hours: req.body.total_hours ? parseFloat(req.body.total_hours) : contracts[contractIndex].total_hours,
    hourly_rate: req.body.hourly_rate ? parseFloat(req.body.hourly_rate) : contracts[contractIndex].hourly_rate,
    end_date: req.body.end_date !== undefined ? req.body.end_date : contracts[contractIndex].end_date,
    status: req.body.status || contracts[contractIndex].status,
    updated_at: new Date().toISOString()
  };

  // Recalculate total amount
  updatedContract.total_amount = updatedContract.total_hours * updatedContract.hourly_rate;

  contracts[contractIndex] = updatedContract;
  writeContracts(contracts);

  return res.status(200).json({
    success: true,
    message: 'Contrato actualizado exitosamente',
    contract: updatedContract
  });
}

function handleDeleteContract(req, res) {
  const { id } = req.query;
  const contracts = readContracts();
  const timeEntries = readTimeEntries();
  
  const contractIndex = contracts.findIndex(c => c.id === parseInt(id));

  if (contractIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Contrato no encontrado'
    });
  }

  // Check if contract has time entries
  const hasTimeEntries = timeEntries.some(entry => entry.contract_id === parseInt(id));
  if (hasTimeEntries) {
    return res.status(400).json({
      success: false,
      message: 'No se puede eliminar el contrato porque tiene entradas de tiempo asociadas'
    });
  }

  contracts.splice(contractIndex, 1);
  writeContracts(contracts);

  return res.status(200).json({
    success: true,
    message: 'Contrato eliminado exitosamente'
  });
}

function handleAddTimeEntry(req, res) {
  const timeEntries = readTimeEntries();
  const contracts = readContracts();
  
  const {
    contract_id,
    project_id,
    description,
    hours_used,
    entry_date,
    created_by,
    notes,
    category_id
  } = req.body;

  // Validate required fields
  if (!description || !hours_used || !entry_date) {
    return res.status(400).json({
      success: false,
      message: 'Campos requeridos: description, hours_used, entry_date'
    });
  }

  // If contract_id is provided, validate remaining hours
  if (contract_id) {
    const contract = contracts.find(c => c.id === parseInt(contract_id));
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contrato no encontrado'
      });
    }

    const contractEntries = timeEntries.filter(entry => entry.contract_id === parseInt(contract_id));
    const usedHours = contractEntries.reduce((sum, entry) => sum + (entry.hours_used || 0), 0);
    const remainingHours = contract.total_hours - usedHours;

    if (parseFloat(hours_used) > remainingHours) {
      return res.status(400).json({
        success: false,
        message: `No hay suficientes horas disponibles. Restantes: ${remainingHours}h`
      });
    }
  }

  const newTimeEntry = {
    id: Math.max(...timeEntries.map(e => e.id), 0) + 1,
    contract_id: contract_id ? parseInt(contract_id) : null,
    project_id: project_id ? parseInt(project_id) : null,
    description,
    hours_used: parseFloat(hours_used),
    entry_date,
    created_by: created_by || null,
    notes: notes || null,
    category_id: category_id ? parseInt(category_id) : 1,
    month_year: entry_date.substring(0, 7), // YYYY-MM
    created_at: new Date().toISOString()
  };

  timeEntries.push(newTimeEntry);
  writeTimeEntries(timeEntries);

  return res.status(201).json({
    success: true,
    message: 'Entrada de tiempo registrada exitosamente',
    time_entry: newTimeEntry
  });
}