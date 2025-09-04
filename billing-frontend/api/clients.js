// Vercel API Route for Clients
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Simulamos una base de datos JSON
const getDataPath = () => join(process.cwd(), 'data', 'clients.json');

const readClients = () => {
  try {
    const data = readFileSync(getDataPath(), 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeClients = (clients) => {
  const dataDir = join(process.cwd(), 'data');
  try {
    writeFileSync(getDataPath(), JSON.stringify(clients, null, 2));
  } catch (error) {
    console.error('Error writing clients:', error);
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
          if (query.summary) {
            return handleGetClientSummary(req, res);
          } else if (query.contracts) {
            return handleGetClientContracts(req, res);
          } else if (query.projects) {
            return handleGetClientProjects(req, res);
          } else {
            return handleGetClient(req, res);
          }
        } else if (query.search) {
          return handleSearchClients(req, res);
        } else {
          return handleGetAllClients(req, res);
        }

      case 'POST':
        return handleCreateClient(req, res);

      case 'PUT':
        if (query.id) {
          return handleUpdateClient(req, res);
        } else {
          return res.status(400).json({
            success: false,
            message: 'ID de cliente requerido para actualización'
          });
        }

      case 'DELETE':
        if (query.id) {
          return handleDeleteClient(req, res);
        } else {
          return res.status(400).json({
            success: false,
            message: 'ID de cliente requerido para eliminación'
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

function handleGetAllClients(req, res) {
  const clients = readClients();
  
  // Add mock statistics for each client
  const clientsWithStats = clients.map(client => ({
    ...client,
    contracts_count: Math.floor(Math.random() * 5),
    projects_count: Math.floor(Math.random() * 8),
    total_contract_value: (Math.random() * 50000).toFixed(0),
    total_project_value: (Math.random() * 30000).toFixed(0),
    total_value: (Math.random() * 80000).toFixed(0)
  }));

  return res.status(200).json({
    success: true,
    clients: clientsWithStats
  });
}

function handleGetClient(req, res) {
  const { id } = req.query;
  const clients = readClients();
  const client = clients.find(c => c.id === parseInt(id));

  if (!client) {
    return res.status(404).json({
      success: false,
      message: 'Cliente no encontrado'
    });
  }

  return res.status(200).json({
    success: true,
    client
  });
}

function handleCreateClient(req, res) {
  const clients = readClients();
  const newClient = {
    id: Math.max(...clients.map(c => c.id), 0) + 1,
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone || null,
    address: req.body.address || null,
    company: req.body.company || null,
    tax_id: req.body.tax_id || null,
    contact_person: req.body.contact_person || null,
    website: req.body.website || null,
    notes: req.body.notes || null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Basic validation
  if (!newClient.name || !newClient.email) {
    return res.status(400).json({
      success: false,
      message: 'Nombre y email son requeridos'
    });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newClient.email)) {
    return res.status(400).json({
      success: false,
      message: 'Formato de email inválido'
    });
  }

  clients.push(newClient);
  writeClients(clients);

  return res.status(201).json({
    success: true,
    message: 'Cliente creado exitosamente',
    client: newClient
  });
}

function handleUpdateClient(req, res) {
  const { id } = req.query;
  const clients = readClients();
  const clientIndex = clients.findIndex(c => c.id === parseInt(id));

  if (clientIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Cliente no encontrado'
    });
  }

  // Basic validation
  if (!req.body.name || !req.body.email) {
    return res.status(400).json({
      success: false,
      message: 'Nombre y email son requeridos'
    });
  }

  const updatedClient = {
    ...clients[clientIndex],
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone || null,
    address: req.body.address || null,
    company: req.body.company || null,
    tax_id: req.body.tax_id || null,
    contact_person: req.body.contact_person || null,
    website: req.body.website || null,
    notes: req.body.notes || null,
    updated_at: new Date().toISOString()
  };

  clients[clientIndex] = updatedClient;
  writeClients(clients);

  return res.status(200).json({
    success: true,
    message: 'Cliente actualizado exitosamente',
    client: updatedClient
  });
}

function handleDeleteClient(req, res) {
  const { id } = req.query;
  const clients = readClients();
  const clientIndex = clients.findIndex(c => c.id === parseInt(id));

  if (clientIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Cliente no encontrado'
    });
  }

  clients.splice(clientIndex, 1);
  writeClients(clients);

  return res.status(200).json({
    success: true,
    message: 'Cliente eliminado exitosamente'
  });
}

function handleSearchClients(req, res) {
  const { search } = req.query;
  const clients = readClients();
  const searchTerm = search.toLowerCase();
  
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm) ||
    client.email.toLowerCase().includes(searchTerm) ||
    (client.company && client.company.toLowerCase().includes(searchTerm))
  );

  return res.status(200).json({
    success: true,
    clients: filteredClients
  });
}

function handleGetClientSummary(req, res) {
  const { id } = req.query;
  const clients = readClients();
  const client = clients.find(c => c.id === parseInt(id));

  if (!client) {
    return res.status(404).json({
      success: false,
      message: 'Cliente no encontrado'
    });
  }

  // Mock summary data
  const summary = {
    ...client,
    contracts_count: Math.floor(Math.random() * 5),
    projects_count: Math.floor(Math.random() * 8),
    total_contract_value: (Math.random() * 50000).toFixed(0),
    total_project_value: (Math.random() * 30000).toFixed(0),
    total_contract_hours_used: (Math.random() * 200).toFixed(1),
    total_project_hours_used: (Math.random() * 150).toFixed(1),
    total_contract_billed: (Math.random() * 40000).toFixed(0),
    total_project_billed: (Math.random() * 25000).toFixed(0)
  };

  return res.status(200).json({
    success: true,
    client: summary
  });
}

function handleGetClientContracts(req, res) {
  // Mock contracts data
  const mockContracts = [];
  return res.status(200).json({
    success: true,
    contracts: mockContracts
  });
}

function handleGetClientProjects(req, res) {
  // Mock projects data
  const mockProjects = [];
  return res.status(200).json({
    success: true,
    projects: mockProjects
  });
}