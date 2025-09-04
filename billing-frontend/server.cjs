// Simple Express server for local development
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Simple session storage (in production use Redis or database)
const sessions = new Map();

// Import API handlers (convert from ES modules to CommonJS for simplicity)
const fs = require('fs');

// Helper functions
const readData = (filename) => {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'data', filename), 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return [];
  }
};

const writeData = (filename, data) => {
  try {
    fs.writeFileSync(path.join(__dirname, 'data', filename), JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
    return false;
  }
};

// Authentication middleware
const authenticateSession = (req, res, next) => {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({
      success: false,
      message: 'No autorizado. Sesión inválida o expirada.'
    });
  }
  
  const session = sessions.get(sessionId);
  if (Date.now() > session.expires) {
    sessions.delete(sessionId);
    return res.status(401).json({
      success: false,
      message: 'Sesión expirada'
    });
  }
  
  req.user = session.user;
  next();
};

// Generate session ID
const generateSessionId = () => {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

// Authentication API
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Usuario y contraseña son requeridos'
    });
  }
  
  const users = readData('users.json');
  const user = users.find(u => u.username === username && u.password === password && u.is_active);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Credenciales inválidas'
    });
  }
  
  // Update last login
  const userIndex = users.findIndex(u => u.id === user.id);
  users[userIndex].last_login = new Date().toISOString();
  writeData('users.json', users);
  
  // Create session
  const sessionId = generateSessionId();
  const sessionData = {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    },
    expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  
  sessions.set(sessionId, sessionData);
  
  res.json({
    success: true,
    message: 'Login exitoso',
    sessionId,
    user: sessionData.user
  });
});

app.post('/api/auth/logout', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (sessionId) {
    sessions.delete(sessionId);
  }
  
  res.json({
    success: true,
    message: 'Logout exitoso'
  });
});

app.get('/api/auth/me', authenticateSession, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Users Management API
app.get('/api/users', authenticateSession, (req, res) => {
  // Only admins can view users
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'No autorizado. Solo administradores pueden ver usuarios.'
    });
  }
  
  const users = readData('users.json');
  const safeUsers = users.map(({ password, ...user }) => user); // Remove passwords
  
  res.json({
    success: true,
    users: safeUsers
  });
});

app.post('/api/users', authenticateSession, (req, res) => {
  // Only admins can create users
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'No autorizado. Solo administradores pueden crear usuarios.'
    });
  }
  
  const users = readData('users.json');
  const { username, email, password, full_name, role = 'user' } = req.body;
  
  if (!username || !email || !password || !full_name) {
    return res.status(400).json({
      success: false,
      message: 'Todos los campos son requeridos'
    });
  }
  
  // Check if username or email already exists
  const existingUser = users.find(u => u.username === username || u.email === email);
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'El usuario o email ya existe'
    });
  }
  
  const newUser = {
    id: Math.max(...users.map(u => u.id), 0) + 1,
    username,
    email,
    password, // In production, hash this password
    full_name,
    role,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login: null
  };
  
  users.push(newUser);
  writeData('users.json', users);
  
  // Remove password from response
  const { password: _, ...safeUser } = newUser;
  
  res.status(201).json({
    success: true,
    message: 'Usuario creado exitosamente',
    user: safeUser
  });
});

app.put('/api/users/:id', authenticateSession, (req, res) => {
  // Only admins can update users (or users updating themselves)
  const userId = parseInt(req.params.id);
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return res.status(403).json({
      success: false,
      message: 'No autorizado'
    });
  }
  
  const users = readData('users.json');
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Usuario no encontrado'
    });
  }
  
  const { username, email, password, full_name, role, is_active } = req.body;
  
  // Check if username or email already exists (excluding current user)
  const existingUser = users.find(u => 
    u.id !== userId && (u.username === username || u.email === email)
  );
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'El usuario o email ya existe'
    });
  }
  
  // Update user
  const updatedUser = {
    ...users[userIndex],
    ...(username && { username }),
    ...(email && { email }),
    ...(password && { password }), // In production, hash this
    ...(full_name && { full_name }),
    ...(req.user.role === 'admin' && role && { role }),
    ...(req.user.role === 'admin' && typeof is_active === 'boolean' && { is_active }),
    updated_at: new Date().toISOString()
  };
  
  users[userIndex] = updatedUser;
  writeData('users.json', users);
  
  // Remove password from response
  const { password: _, ...safeUser } = updatedUser;
  
  res.json({
    success: true,
    message: 'Usuario actualizado exitosamente',
    user: safeUser
  });
});

app.delete('/api/users/:id', authenticateSession, (req, res) => {
  // Only admins can delete users
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'No autorizado. Solo administradores pueden eliminar usuarios.'
    });
  }
  
  const userId = parseInt(req.params.id);
  
  // Don't allow deleting own account
  if (userId === req.user.id) {
    return res.status(400).json({
      success: false,
      message: 'No puedes eliminar tu propia cuenta'
    });
  }
  
  const users = readData('users.json');
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Usuario no encontrado'
    });
  }
  
  const deletedUser = users[userIndex];
  users.splice(userIndex, 1);
  writeData('users.json', users);
  
  // Remove password from response
  const { password: _, ...safeUser } = deletedUser;
  
  res.json({
    success: true,
    message: 'Usuario eliminado exitosamente',
    user: safeUser
  });
});

// Clients API
app.get('/api/clients', (req, res) => {
  const clients = readData('clients.json');
  const contracts = readData('contracts.json');
  const projects = readData('projects.json');
  
  const clientsWithStats = clients.map(client => {
    const clientContracts = contracts.filter(c => c.client_id === client.id);
    const clientProjects = projects.filter(p => p.client_id === client.id);
    
    const totalContractValue = clientContracts.reduce((sum, contract) => {
      return sum + (parseFloat(contract.value) || 0);
    }, 0);
    
    const totalProjectValue = clientProjects.reduce((sum, project) => {
      return sum + (parseFloat(project.value) || 0);
    }, 0);
    
    return {
      ...client,
      contracts_count: clientContracts.length,
      projects_count: clientProjects.length,
      total_contract_value: totalContractValue,
      total_project_value: totalProjectValue,
      total_value: totalContractValue + totalProjectValue
    };
  });

  res.json({
    success: true,
    clients: clientsWithStats
  });
});

app.get('/api/clients/:id', (req, res) => {
  const { id, summary, contracts, projects } = req.query;
  const clientId = id ? parseInt(id) : parseInt(req.params.id);
  
  const clients = readData('clients.json');
  const client = clients.find(c => c.id === clientId);

  if (!client) {
    return res.status(404).json({
      success: false,
      message: 'Cliente no encontrado'
    });
  }

  // If requesting summary
  if (summary) {
    const contractsData = readData('contracts.json');
    const projectsData = readData('projects.json');
    const timeEntries = readData('time_entries.json');
    
    const clientContracts = contractsData.filter(c => c.client_id === clientId);
    const clientProjects = projectsData.filter(p => p.client_id === clientId);
    
    const totalContractValue = clientContracts.reduce((sum, contract) => {
      return sum + ((parseFloat(contract.total_hours) || 0) * (parseFloat(contract.hourly_rate) || 0));
    }, 0);
    
    const totalProjectValue = clientProjects.reduce((sum, project) => {
      return sum + (parseFloat(project.total_amount) || ((parseFloat(project.hourly_rate) || 0) * (parseFloat(project.estimated_hours) || 0)));
    }, 0);

    const totalContractBilled = clientContracts.reduce((sum, contract) => {
      return sum + (parseFloat(contract.billed_amount) || 0);
    }, 0);
    
    const totalProjectBilled = clientProjects.reduce((sum, project) => {
      return sum + (parseFloat(project.paid_amount) || 0);
    }, 0);
    
    const clientSummary = {
      ...client,
      contracts_count: clientContracts.length,
      projects_count: clientProjects.length,
      total_contract_value: totalContractValue,
      total_project_value: totalProjectValue,
      total_value: totalContractValue + totalProjectValue,
      total_contract_billed: totalContractBilled,
      total_project_billed: totalProjectBilled,
      total_billed: totalContractBilled + totalProjectBilled
    };
    
    return res.json({
      success: true,
      client: clientSummary
    });
  }
  
  // If requesting contracts
  if (contracts) {
    const contractsData = readData('contracts.json');
    const clientContracts = contractsData.filter(c => c.client_id === clientId);
    
    return res.json({
      success: true,
      contracts: clientContracts
    });
  }
  
  // If requesting projects
  if (projects) {
    const projectsData = readData('projects.json');
    const clientProjects = projectsData.filter(p => p.client_id === clientId);
    
    return res.json({
      success: true,
      projects: clientProjects
    });
  }

  res.json({
    success: true,
    client
  });
});

app.post('/api/clients', (req, res) => {
  const clients = readData('clients.json');
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

  if (!newClient.name || !newClient.email) {
    return res.status(400).json({
      success: false,
      message: 'Nombre y email son requeridos'
    });
  }

  clients.push(newClient);
  writeData('clients.json', clients);

  res.status(201).json({
    success: true,
    message: 'Cliente creado exitosamente',
    client: newClient
  });
});

// Update client
app.put('/api/clients/:id', (req, res) => {
  const clients = readData('clients.json');
  const clientId = parseInt(req.params.id);
  const clientIndex = clients.findIndex(c => c.id === clientId);

  if (clientIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Cliente no encontrado'
    });
  }

  const updatedClient = {
    ...clients[clientIndex],
    ...req.body,
    id: clientId,
    updated_at: new Date().toISOString()
  };

  if (!updatedClient.name || !updatedClient.email) {
    return res.status(400).json({
      success: false,
      message: 'Nombre y email son requeridos'
    });
  }

  clients[clientIndex] = updatedClient;
  writeData('clients.json', clients);

  res.json({
    success: true,
    message: 'Cliente actualizado exitosamente',
    client: updatedClient
  });
});

// Delete client
app.delete('/api/clients/:id', (req, res) => {
  const clients = readData('clients.json');
  const clientId = parseInt(req.params.id);
  const clientIndex = clients.findIndex(c => c.id === clientId);

  if (clientIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Cliente no encontrado'
    });
  }

  // Check if client has contracts or projects
  const contracts = readData('contracts.json');
  const projects = readData('projects.json');
  const hasContracts = contracts.some(c => c.client_id === clientId);
  const hasProjects = projects.some(p => p.client_id === clientId && !p.is_independent);

  if (hasContracts || hasProjects) {
    return res.status(400).json({
      success: false,
      message: 'No se puede eliminar el cliente porque tiene contratos o proyectos asociados'
    });
  }

  const deletedClient = clients[clientIndex];
  clients.splice(clientIndex, 1);
  writeData('clients.json', clients);

  res.json({
    success: true,
    message: 'Cliente eliminado exitosamente',
    client: deletedClient
  });
});

// Contracts API
app.get('/api/contracts', (req, res) => {
  const contracts = readData('contracts.json');
  const clients = readData('clients.json');
  const timeEntries = readData('time_entries.json');

  const contractsWithStats = contracts.map(contract => {
    const client = clients.find(c => c.id === contract.client_id);
    const contractEntries = timeEntries.filter(entry => entry.contract_id === contract.id);
    const usedHours = contractEntries.reduce((sum, entry) => sum + (entry.hours_used || 0), 0);
    const remainingHours = Math.max(0, contract.total_hours - usedHours);
    // Use the actual billed_amount from payments, not calculated from hours
    const billedAmount = contract.billed_amount || 0;

    return {
      ...contract,
      client_name: client ? client.name : 'Cliente no encontrado',
      used_hours: usedHours,
      remaining_hours: remainingHours,
      billed_amount: billedAmount,
      entries_count: contractEntries.length
    };
  });

  res.json({
    success: true,
    contracts: contractsWithStats
  });
});

// Create new contract
app.post('/api/contracts', (req, res) => {
  // Handle time entry creation
  if (req.body.action === 'add_time_entry') {
    const timeEntries = readData('time_entries.json');
    const contracts = readData('contracts.json');
    
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

    if (!description || !hours_used || !entry_date) {
      return res.status(400).json({
        success: false,
        message: 'Campos requeridos: description, hours_used, entry_date'
      });
    }

    // Validate remaining hours for contract
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
      month_year: entry_date.substring(0, 7),
      created_at: new Date().toISOString()
    };

    timeEntries.push(newTimeEntry);
    writeData('time_entries.json', timeEntries);

    return res.status(201).json({
      success: true,
      message: 'Entrada de tiempo registrada exitosamente',
      time_entry: newTimeEntry
    });
  }

  // Handle contract creation
  const contracts = readData('contracts.json');
  const clients = readData('clients.json');

  const {
    client_id,
    contract_number,
    description,
    total_hours,
    hourly_rate,
    start_date,
    end_date,
    status = 'active'
  } = req.body;

  if (!client_id || !contract_number || !description || !total_hours || !hourly_rate) {
    return res.status(400).json({
      success: false,
      message: 'Campos requeridos: client_id, contract_number, description, total_hours, hourly_rate'
    });
  }

  // Validate client exists
  const client = clients.find(c => c.id === parseInt(client_id));
  if (!client) {
    return res.status(404).json({
      success: false,
      message: 'Cliente no encontrado'
    });
  }

  // Check if contract number already exists
  const existingContract = contracts.find(c => c.contract_number === contract_number);
  if (existingContract) {
    return res.status(400).json({
      success: false,
      message: 'El número de contrato ya existe'
    });
  }

  const newContract = {
    id: Math.max(...contracts.map(c => c.id), 0) + 1,
    client_id: parseInt(client_id),
    contract_number,
    description,
    total_hours: parseInt(total_hours),
    hourly_rate: parseFloat(hourly_rate),
    start_date,
    end_date,
    status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  contracts.push(newContract);
  writeData('contracts.json', contracts);

  res.status(201).json({
    success: true,
    message: 'Contrato creado exitosamente',
    contract: newContract
  });
});

// Update contract
app.put('/api/contracts/:id', (req, res) => {
  const contracts = readData('contracts.json');
  const contractId = parseInt(req.params.id);
  const contractIndex = contracts.findIndex(c => c.id === contractId);

  if (contractIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Contrato no encontrado'
    });
  }

  const updatedContract = {
    ...contracts[contractIndex],
    ...req.body,
    id: contractId,
    updated_at: new Date().toISOString()
  };

  contracts[contractIndex] = updatedContract;
  writeData('contracts.json', contracts);

  res.json({
    success: true,
    message: 'Contrato actualizado exitosamente',
    contract: updatedContract
  });
});

// Delete contract
app.delete('/api/contracts/:id', (req, res) => {
  const contracts = readData('contracts.json');
  const contractId = parseInt(req.params.id);
  const contractIndex = contracts.findIndex(c => c.id === contractId);

  if (contractIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Contrato no encontrado'
    });
  }

  const force = req.query.force === 'true';

  if (!force) {
    // Check if contract has time entries or projects
    const timeEntries = readData('time_entries.json');
    const projects = readData('projects.json');
    const hasTimeEntries = timeEntries.some(e => e.contract_id === contractId);
    const hasProjects = projects.some(p => p.contract_id === contractId);

    if (hasTimeEntries || hasProjects) {
      return res.json({
        success: false,
        requiresConfirmation: true,
        message: 'Este contrato tiene entradas de tiempo o proyectos asociados. ¿Desea eliminarlo de todas formas?',
        relatedData: {
          timeEntries: hasTimeEntries,
          projects: hasProjects
        }
      });
    }
  } else {
    // Force delete - remove all related data
    let timeEntries = readData('time_entries.json');
    let projects = readData('projects.json');
    
    // Remove related time entries
    timeEntries = timeEntries.filter(e => e.contract_id !== contractId);
    writeData('time_entries.json', timeEntries);
    
    // Remove or update related projects
    projects = projects.map(p => {
      if (p.contract_id === contractId) {
        return {
          ...p,
          contract_id: null,
          is_independent: true,
          status: 'cancelled'
        };
      }
      return p;
    });
    writeData('projects.json', projects);
  }

  const deletedContract = contracts[contractIndex];
  contracts.splice(contractIndex, 1);
  writeData('contracts.json', contracts);

  res.json({
    success: true,
    message: force ? 
      'Contrato y datos relacionados eliminados exitosamente' : 
      'Contrato eliminado exitosamente',
    contract: deletedContract
  });
});

// Projects API
app.get('/api/projects', (req, res) => {
  const projects = readData('projects.json');
  const clients = readData('clients.json');
  const contracts = readData('contracts.json');
  const timeEntries = readData('time_entries.json');

  const projectsWithStats = projects.map(project => {
    const projectEntries = timeEntries.filter(entry => entry.project_id === project.id);
    const usedHours = projectEntries.reduce((sum, entry) => sum + (entry.hours_used || 0), 0);
    const remainingHours = Math.max(0, (project.estimated_hours || 0) - usedHours);
    
    let currentCost = 0;
    let clientName = 'Cliente no encontrado';
    let contractNumber = null;

    if (project.is_independent && project.hourly_rate) {
      currentCost = usedHours * project.hourly_rate;
      clientName = project.client_name || 'Cliente Independiente';
    } else {
      const contract = contracts.find(c => c.id === project.contract_id);
      if (contract) {
        currentCost = usedHours * contract.hourly_rate;
        contractNumber = contract.contract_number;
        const client = clients.find(c => c.id === contract.client_id);
        clientName = client ? client.name : 'Cliente no encontrado';
      }
    }

    return {
      ...project,
      used_hours: usedHours,
      remaining_hours: remainingHours,
      current_cost: currentCost,
      entries_count: projectEntries.length,
      client_name: clientName,
      contract_number: contractNumber
    };
  });

  res.json({
    success: true,
    projects: projectsWithStats
  });
});

// Create new project
app.post('/api/projects', (req, res) => {
  const projects = readData('projects.json');
  const clients = readData('clients.json');
  const contracts = readData('contracts.json');

  const {
    name,
    description,
    contract_id,
    client_id,
    is_independent = false,
    client_name,
    hourly_rate,
    estimated_hours,
    start_date,
    end_date,
    status = 'active'
  } = req.body;

  if (!name || !description) {
    return res.status(400).json({
      success: false,
      message: 'Campos requeridos: name, description'
    });
  }

  // Validate contract if not independent
  if (!is_independent && contract_id) {
    const contract = contracts.find(c => c.id === parseInt(contract_id));
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contrato no encontrado'
      });
    }
  }

  // For independent projects, validate hourly rate
  if (is_independent && !hourly_rate) {
    return res.status(400).json({
      success: false,
      message: 'Para proyectos independientes, la tarifa por hora es requerida'
    });
  }

  // Get client name for contract projects
  let resolvedClientName = client_name;
  if (!is_independent && client_id) {
    const client = clients.find(c => c.id === parseInt(client_id));
    resolvedClientName = client ? client.name : null;
  }

  // Calculate total_amount for independent projects
  const calculatedTotalAmount = is_independent && hourly_rate && estimated_hours 
    ? parseFloat(hourly_rate) * parseInt(estimated_hours)
    : null;

  const newProject = {
    id: Math.max(...projects.map(p => p.id), 0) + 1,
    name,
    description,
    contract_id: is_independent ? null : (contract_id ? parseInt(contract_id) : null),
    client_id: is_independent ? null : (client_id ? parseInt(client_id) : null),
    is_independent,
    client_name: resolvedClientName,
    hourly_rate: is_independent ? parseFloat(hourly_rate) : null,
    estimated_hours: estimated_hours ? parseInt(estimated_hours) : null,
    total_amount: calculatedTotalAmount,
    start_date,
    end_date,
    status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  projects.push(newProject);
  writeData('projects.json', projects);

  res.status(201).json({
    success: true,
    message: 'Proyecto creado exitosamente',
    project: newProject
  });
});

// Update project
app.put('/api/projects/:id', (req, res) => {
  const projects = readData('projects.json');
  const projectId = parseInt(req.params.id);
  const projectIndex = projects.findIndex(p => p.id === projectId);

  if (projectIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }

  const updatedProject = {
    ...projects[projectIndex],
    ...req.body,
    id: projectId,
    updated_at: new Date().toISOString()
  };

  // Calculate total_amount for independent projects if hourly_rate or estimated_hours changed
  if (updatedProject.is_independent && updatedProject.hourly_rate && updatedProject.estimated_hours) {
    updatedProject.total_amount = parseFloat(updatedProject.hourly_rate) * parseInt(updatedProject.estimated_hours);
  }

  // Validate required fields
  if (!updatedProject.name || !updatedProject.description) {
    return res.status(400).json({
      success: false,
      message: 'Campos requeridos: name, description'
    });
  }

  projects[projectIndex] = updatedProject;
  writeData('projects.json', projects);

  res.json({
    success: true,
    message: 'Proyecto actualizado exitosamente',
    project: updatedProject
  });
});

// Delete project
app.delete('/api/projects/:id', (req, res) => {
  const projects = readData('projects.json');
  const projectId = parseInt(req.params.id);
  const projectIndex = projects.findIndex(p => p.id === projectId);

  if (projectIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }

  // Check if project has time entries
  const timeEntries = readData('time_entries.json');
  const hasTimeEntries = timeEntries.some(e => e.project_id === projectId);

  if (hasTimeEntries) {
    return res.status(400).json({
      success: false,
      message: 'No se puede eliminar el proyecto porque tiene entradas de tiempo asociadas'
    });
  }

  const deletedProject = projects[projectIndex];
  projects.splice(projectIndex, 1);
  writeData('projects.json', projects);

  res.json({
    success: true,
    message: 'Proyecto eliminado exitosamente',
    project: deletedProject
  });
});

// Add payment to contract
app.post('/api/contracts/:id/payment', (req, res) => {
  const contracts = readData('contracts.json');
  const contractId = parseInt(req.params.id);
  const contractIndex = contracts.findIndex(c => c.id === contractId);

  if (contractIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Contrato no encontrado'
    });
  }

  const { amount, description, payment_date, payment_type, percentage } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'El monto del pago debe ser mayor a 0'
    });
  }

  // Update contract
  const contract = contracts[contractIndex];
  contract.billed_amount = (contract.billed_amount || 0) + parseFloat(amount);
  contract.remaining_amount = Math.max(0, (contract.total_hours * contract.hourly_rate) - contract.billed_amount);
  contract.last_payment_date = payment_date;
  contract.updated_at = new Date().toISOString();

  // Create payment record (you might want a separate payments table)
  const payments = readData('payments.json') || [];
  const newPayment = {
    id: Math.max(...payments.map(p => p.id), 0) + 1,
    contract_id: contractId,
    project_id: null,
    amount: parseFloat(amount),
    description: description || null,
    payment_date,
    payment_type,
    percentage: percentage || null,
    created_at: new Date().toISOString()
  };
  
  payments.push(newPayment);
  writeData('contracts.json', contracts);
  writeData('payments.json', payments);

  res.json({
    success: true,
    message: 'Pago registrado exitosamente',
    payment: newPayment,
    contract: contract
  });
});

// Add payment to project
app.post('/api/projects/:id/payment', (req, res) => {
  const projects = readData('projects.json');
  const projectId = parseInt(req.params.id);
  const projectIndex = projects.findIndex(p => p.id === projectId);

  if (projectIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }

  const { amount, description, payment_date, payment_type, percentage } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'El monto del pago debe ser mayor a 0'
    });
  }

  // Update project
  const project = projects[projectIndex];
  project.paid_amount = (project.paid_amount || 0) + parseFloat(amount);
  project.last_payment_date = payment_date;
  project.updated_at = new Date().toISOString();

  // Create payment record
  const payments = readData('payments.json') || [];
  const newPayment = {
    id: Math.max(...payments.map(p => p.id), 0) + 1,
    contract_id: null,
    project_id: projectId,
    amount: parseFloat(amount),
    description: description || null,
    payment_date,
    payment_type,
    percentage: percentage || null,
    created_at: new Date().toISOString()
  };
  
  payments.push(newPayment);
  writeData('projects.json', projects);
  writeData('payments.json', payments);

  res.json({
    success: true,
    message: 'Pago registrado exitosamente',
    payment: newPayment,
    project: project
  });
});

// Payments API
app.get('/api/payments', (req, res) => {
  const payments = readData('payments.json') || [];
  const { contract_id, project_id } = req.query;

  let filteredPayments = payments;
  
  if (contract_id) {
    filteredPayments = payments.filter(p => p.contract_id === parseInt(contract_id));
  }
  
  if (project_id) {
    filteredPayments = payments.filter(p => p.project_id === parseInt(project_id));
  }

  res.json({
    success: true,
    payments: filteredPayments
  });
});

// Delete payment
app.delete('/api/payments/:id', (req, res) => {
  const paymentId = parseInt(req.params.id);
  const payments = readData('payments.json') || [];
  
  const paymentIndex = payments.findIndex(p => p.id === paymentId);
  if (paymentIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Pago no encontrado'
    });
  }

  const payment = payments[paymentIndex];
  
  // Update contract or project amounts
  if (payment.contract_id) {
    const contracts = readData('contracts.json');
    const contractIndex = contracts.findIndex(c => c.id === payment.contract_id);
    
    if (contractIndex !== -1) {
      const contract = contracts[contractIndex];
      contract.billed_amount = Math.max(0, (contract.billed_amount || 0) - payment.amount);
      contract.remaining_amount = (contract.total_hours * contract.hourly_rate) - contract.billed_amount;
      contract.updated_at = new Date().toISOString();
      
      writeData('contracts.json', contracts);
    }
  }
  
  if (payment.project_id) {
    const projects = readData('projects.json');
    const projectIndex = projects.findIndex(p => p.id === payment.project_id);
    
    if (projectIndex !== -1) {
      const project = projects[projectIndex];
      project.billed_amount = Math.max(0, (project.billed_amount || 0) - payment.amount);
      project.remaining_amount = (project.total_hours * project.hourly_rate) - project.billed_amount;
      project.updated_at = new Date().toISOString();
      
      writeData('projects.json', projects);
    }
  }

  // Remove payment from payments array
  payments.splice(paymentIndex, 1);
  writeData('payments.json', payments);

  res.json({
    success: true,
    message: 'Pago eliminado exitosamente'
  });
});

// Update payment
app.put('/api/payments/:id', (req, res) => {
  const paymentId = parseInt(req.params.id);
  const { amount, description, payment_date, payment_type, percentage } = req.body;
  
  const payments = readData('payments.json') || [];
  const paymentIndex = payments.findIndex(p => p.id === paymentId);
  
  if (paymentIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Pago no encontrado'
    });
  }

  const oldPayment = payments[paymentIndex];
  const oldAmount = oldPayment.amount;
  
  // Update payment data
  payments[paymentIndex] = {
    ...oldPayment,
    amount: parseFloat(amount),
    description: description || null,
    payment_date: payment_date,
    payment_type: payment_type,
    percentage: percentage ? parseFloat(percentage) : null,
    updated_at: new Date().toISOString()
  };
  
  // Update contract or project amounts (subtract old amount, add new amount)
  const amountDifference = parseFloat(amount) - oldAmount;
  
  if (oldPayment.contract_id) {
    const contracts = readData('contracts.json');
    const contractIndex = contracts.findIndex(c => c.id === oldPayment.contract_id);
    
    if (contractIndex !== -1) {
      const contract = contracts[contractIndex];
      contract.billed_amount = Math.max(0, (contract.billed_amount || 0) + amountDifference);
      contract.remaining_amount = (contract.total_hours * contract.hourly_rate) - contract.billed_amount;
      contract.updated_at = new Date().toISOString();
      
      writeData('contracts.json', contracts);
    }
  }
  
  if (oldPayment.project_id) {
    const projects = readData('projects.json');
    const projectIndex = projects.findIndex(p => p.id === oldPayment.project_id);
    
    if (projectIndex !== -1) {
      const project = projects[projectIndex];
      project.paid_amount = Math.max(0, (project.paid_amount || 0) + amountDifference);
      project.updated_at = new Date().toISOString();
      
      // Update last_payment_date if this is the most recent payment
      if (payment_date >= (project.last_payment_date || '1900-01-01')) {
        project.last_payment_date = payment_date;
      }
      
      writeData('projects.json', projects);
    }
  }

  // Save updated payments
  writeData('payments.json', payments);

  res.json({
    success: true,
    message: 'Pago actualizado exitosamente',
    payment: payments[paymentIndex]
  });
});

// Categories API
app.get('/api/categories', (req, res) => {
  const categories = readData('categories.json');
  const filteredCategories = categories.filter(category => category.is_active);

  res.json({
    success: true,
    categories: filteredCategories
  });
});

// Get category by ID
app.get('/api/categories/:id', (req, res) => {
  const categories = readData('categories.json');
  const category = categories.find(c => c.id === parseInt(req.params.id));

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Categoría no encontrada'
    });
  }

  res.json({
    success: true,
    category
  });
});

// Create new category
app.post('/api/categories', (req, res) => {
  const categories = readData('categories.json');

  const {
    name,
    description,
    color = '#3B82F6',
    is_active = true
  } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'El nombre de la categoría es requerido'
    });
  }

  // Check if category name already exists
  const existingCategory = categories.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (existingCategory) {
    return res.status(400).json({
      success: false,
      message: 'Ya existe una categoría con ese nombre'
    });
  }

  const newCategory = {
    id: Math.max(...categories.map(c => c.id), 0) + 1,
    name,
    description: description || null,
    color,
    is_active,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  categories.push(newCategory);
  writeData('categories.json', categories);

  res.status(201).json({
    success: true,
    message: 'Categoría creada exitosamente',
    category: newCategory
  });
});

// Update category
app.put('/api/categories/:id', (req, res) => {
  const categories = readData('categories.json');
  const categoryId = parseInt(req.params.id);
  const categoryIndex = categories.findIndex(c => c.id === categoryId);

  if (categoryIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Categoría no encontrada'
    });
  }

  // Handle toggle active action
  if (req.body.toggle_active) {
    const updatedCategory = {
      ...categories[categoryIndex],
      is_active: !categories[categoryIndex].is_active,
      updated_at: new Date().toISOString()
    };

    categories[categoryIndex] = updatedCategory;
    writeData('categories.json', categories);

    return res.json({
      success: true,
      message: `Categoría ${updatedCategory.is_active ? 'activada' : 'desactivada'} exitosamente`,
      category: updatedCategory
    });
  }

  const updatedCategory = {
    ...categories[categoryIndex],
    ...req.body,
    id: categoryId,
    updated_at: new Date().toISOString()
  };

  if (!updatedCategory.name) {
    return res.status(400).json({
      success: false,
      message: 'El nombre de la categoría es requerido'
    });
  }

  // Check if category name already exists (excluding current category)
  const existingCategory = categories.find(c => 
    c.id !== categoryId && c.name.toLowerCase() === updatedCategory.name.toLowerCase()
  );
  if (existingCategory) {
    return res.status(400).json({
      success: false,
      message: 'Ya existe una categoría con ese nombre'
    });
  }

  categories[categoryIndex] = updatedCategory;
  writeData('categories.json', categories);

  res.json({
    success: true,
    message: 'Categoría actualizada exitosamente',
    category: updatedCategory
  });
});

// Delete category
app.delete('/api/categories/:id', (req, res) => {
  const categories = readData('categories.json');
  const categoryId = parseInt(req.params.id);
  const categoryIndex = categories.findIndex(c => c.id === categoryId);

  if (categoryIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Categoría no encontrada'
    });
  }

  // Don't allow deletion of category ID 1 (General)
  if (categoryId === 1) {
    return res.status(400).json({
      success: false,
      message: 'No se puede eliminar la categoría General'
    });
  }

  // Check if category is being used in time entries
  const timeEntries = readData('time_entries.json');
  const isUsed = timeEntries.some(e => e.category_id === categoryId);

  if (isUsed) {
    return res.status(400).json({
      success: false,
      message: 'No se puede eliminar la categoría porque está siendo utilizada en entradas de tiempo'
    });
  }

  const deletedCategory = categories[categoryIndex];
  categories.splice(categoryIndex, 1);
  writeData('categories.json', categories);

  res.json({
    success: true,
    message: 'Categoría eliminada exitosamente',
    category: deletedCategory
  });
});

// Time Entries API
app.get('/api/time-entries', (req, res) => {
  const timeEntries = readData('time_entries.json');
  const contracts = readData('contracts.json');
  const projects = readData('projects.json');
  const categories = readData('categories.json');
  const clients = readData('clients.json');
  
  const enrichedEntries = timeEntries.map(entry => {
    const contract = contracts.find(c => c.id === entry.contract_id);
    const project = projects.find(p => p.id === entry.project_id);
    const category = categories.find(c => c.id === entry.category_id);
    
    let clientName = 'Cliente no encontrado';
    if (project && project.is_independent) {
      clientName = project.client_name || 'Cliente Independiente';
    } else if (contract) {
      const client = clients.find(c => c.id === contract.client_id);
      clientName = client ? client.name : 'Cliente no encontrado';
    }
    
    return {
      ...entry,
      contract_number: contract ? contract.contract_number : null,
      project_name: project ? project.name : null,
      category_name: category ? category.name : 'General',
      client_name: clientName
    };
  });
  
  res.json({
    success: true,
    time_entries: enrichedEntries
  });
});

app.post('/api/time-entries', (req, res) => {
  const timeEntries = readData('time_entries.json');
  const contracts = readData('contracts.json');
  const projects = readData('projects.json');
  
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

  if (!description || !hours_used || !entry_date) {
    return res.status(400).json({
      success: false,
      message: 'Campos requeridos: description, hours_used, entry_date'
    });
  }

  let amount = 0;
  
  // Validate remaining hours for contract
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
    amount = parseFloat(hours_used) * (contract.hourly_rate || 0);
  }
  
  // Handle independent project payments
  if (project_id && !contract_id) {
    const project = projects.find(p => p.id === parseInt(project_id));
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado'
      });
    }
    if (project.is_independent) {
      amount = parseFloat(hours_used) * (project.hourly_rate || 0);
      
      // Update project paid amount
      project.paid_amount = (project.paid_amount || 0) + amount;
      project.updated_at = new Date().toISOString();
      writeData('projects.json', projects);
    }
  }

  const newTimeEntry = {
    id: Math.max(...timeEntries.map(e => e.id), 0) + 1,
    contract_id: contract_id ? parseInt(contract_id) : null,
    project_id: project_id ? parseInt(project_id) : null,
    description,
    hours_used: parseFloat(hours_used),
    amount: amount,
    entry_date,
    created_by: created_by || 'Sistema',
    notes: notes || null,
    category_id: category_id ? parseInt(category_id) : 1,
    month_year: entry_date.substring(0, 7),
    created_at: new Date().toISOString()
  };

  timeEntries.push(newTimeEntry);
  writeData('time_entries.json', timeEntries);

  res.status(201).json({
    success: true,
    message: 'Entrada de tiempo registrada exitosamente',
    time_entry: newTimeEntry
  });
});

// Delete time entry
app.delete('/api/time-entries/:id', authenticateSession, (req, res) => {
  const entryId = parseInt(req.params.id);
  const timeEntries = readData('time_entries.json');
  
  const entryIndex = timeEntries.findIndex(entry => entry.id === entryId);
  
  if (entryIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Entrada de tiempo no encontrada'
    });
  }
  
  const deletedEntry = timeEntries.splice(entryIndex, 1)[0];
  writeData('time_entries.json', timeEntries);
  
  res.json({
    success: true,
    message: 'Entrada de tiempo eliminada exitosamente',
    deleted_entry: deletedEntry
  });
});

// Update time entry
app.put('/api/time-entries/:id', (req, res) => {
  const entryId = parseInt(req.params.id);
  const timeEntries = readData('time_entries.json');
  const contracts = readData('contracts.json');
  const projects = readData('projects.json');

  const entryIndex = timeEntries.findIndex(entry => entry.id === entryId);
  
  if (entryIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Entrada de tiempo no encontrada'
    });
  }

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

  // Get the old entry for comparison
  const oldEntry = { ...timeEntries[entryIndex] };

  // Update the entry
  const updatedEntry = {
    ...timeEntries[entryIndex],
    contract_id: contract_id || null,
    project_id: project_id || null,
    description,
    hours_used: parseFloat(hours_used),
    entry_date,
    created_by: created_by || null,
    notes: notes || null,
    category_id: parseInt(category_id) || 1,
    updated_at: new Date().toISOString()
  };

  // Update hours in contract or project if hours changed
  const hoursDifference = parseFloat(hours_used) - parseFloat(oldEntry.hours_used);
  
  if (hoursDifference !== 0) {
    if (contract_id) {
      const contractIndex = contracts.findIndex(c => c.id === parseInt(contract_id));
      if (contractIndex !== -1) {
        contracts[contractIndex].used_hours = (contracts[contractIndex].used_hours || 0) + hoursDifference;
        contracts[contractIndex].remaining_hours = contracts[contractIndex].total_hours - contracts[contractIndex].used_hours;
        contracts[contractIndex].updated_at = new Date().toISOString();
        writeData('contracts.json', contracts);
      }
    }
    
    if (project_id) {
      const projectIndex = projects.findIndex(p => p.id === parseInt(project_id));
      if (projectIndex !== -1) {
        projects[projectIndex].used_hours = (projects[projectIndex].used_hours || 0) + hoursDifference;
        projects[projectIndex].remaining_hours = (projects[projectIndex].estimated_hours || 0) - projects[projectIndex].used_hours;
        projects[projectIndex].updated_at = new Date().toISOString();
        writeData('projects.json', projects);
      }
    }
  }

  timeEntries[entryIndex] = updatedEntry;
  writeData('time_entries.json', timeEntries);

  res.json({
    success: true,
    message: 'Entrada de tiempo actualizada exitosamente',
    time_entry: updatedEntry
  });
});

// Reports API
app.get('/api/reports', (req, res) => {
  const { action, year, month, start_date, end_date } = req.query;
  
  if (action === 'overview') {
    const contracts = readData('contracts.json');
    const projects = readData('projects.json');
    const timeEntries = readData('time_entries.json');
    
    const totalUsedHours = timeEntries.reduce((sum, entry) => sum + (entry.hours_used || 0), 0);
    const totalBilledAmount = contracts.reduce((sum, contract) => {
      const contractEntries = timeEntries.filter(entry => entry.contract_id === contract.id);
      const usedHours = contractEntries.reduce((sum, entry) => sum + (entry.hours_used || 0), 0);
      return sum + (usedHours * contract.hourly_rate);
    }, 0);
    
    const stats = {
      total_contracts: contracts.length,
      active_contracts: contracts.filter(c => c.status === 'active').length,
      total_projects: projects.length,
      active_projects: projects.filter(p => p.status === 'active').length,
      total_used_hours: totalUsedHours,
      total_billed_amount: totalBilledAmount
    };
    
    return res.json({
      success: true,
      stats
    });
  }
  
  if (action === 'monthly') {
    const contracts = readData('contracts.json');
    const clients = readData('clients.json');
    const timeEntries = readData('time_entries.json');
    
    const targetMonth = `${year}-${String(month).padStart(2, '0')}`;
    const monthlyEntries = timeEntries.filter(entry => 
      entry.entry_date && entry.entry_date.startsWith(targetMonth)
    );
    
    const monthlyData = [];
    const clientSummary = {};
    
    monthlyEntries.forEach(entry => {
      const contract = contracts.find(c => c.id === entry.contract_id);
      if (!contract) return;
      
      const client = clients.find(c => c.id === contract.client_id);
      if (!client) return;
      
      const clientKey = client.id;
      if (!clientSummary[clientKey]) {
        clientSummary[clientKey] = {
          client_name: client.name,
          company: client.company,
          total_hours: 0,
          total_amount: 0,
          contracts: {}
        };
      }
      
      const contractKey = contract.id;
      if (!clientSummary[clientKey].contracts[contractKey]) {
        clientSummary[clientKey].contracts[contractKey] = {
          contract_number: contract.contract_number,
          hours: 0,
          amount: 0
        };
      }
      
      const amount = entry.hours_used * contract.hourly_rate;
      clientSummary[clientKey].total_hours += entry.hours_used;
      clientSummary[clientKey].total_amount += amount;
      clientSummary[clientKey].contracts[contractKey].hours += entry.hours_used;
      clientSummary[clientKey].contracts[contractKey].amount += amount;
    });
    
    Object.keys(clientSummary).forEach(clientId => {
      const summary = clientSummary[clientId];
      const contractsArray = Object.keys(summary.contracts).map(contractId => ({
        contract_id: parseInt(contractId),
        ...summary.contracts[contractId]
      }));
      
      monthlyData.push({
        client_id: parseInt(clientId),
        client_name: summary.client_name,
        company: summary.company,
        total_hours: summary.total_hours,
        total_amount: summary.total_amount,
        contracts: contractsArray
      });
    });
    
    return res.json({
      success: true,
      data: monthlyData,
      period: { year: parseInt(year), month: parseInt(month) }
    });
  }
  
  if (action === 'active_contracts') {
    const contracts = readData('contracts.json');
    const clients = readData('clients.json');
    const timeEntries = readData('time_entries.json');
    
    const activeContracts = contracts
      .filter(contract => contract.status === 'active')
      .map(contract => {
        const client = clients.find(c => c.id === contract.client_id);
        const contractEntries = timeEntries.filter(entry => entry.contract_id === contract.id);
        
        const usedHours = contractEntries.reduce((sum, entry) => sum + (entry.hours_used || 0), 0);
        const totalContractValue = (contract.total_hours || 0) * (contract.hourly_rate || 0);
        const billedAmount = contract.billed_amount || 0;
        const remainingHours = Math.max(0, contract.total_hours - usedHours);
        const remainingAmount = Math.max(0, totalContractValue - billedAmount);
        const progress = contract.total_hours > 0 ? (usedHours / contract.total_hours) * 100 : 0;
        
        return {
          id: contract.id,
          contract_number: contract.contract_number,
          client_name: client ? client.name : 'Cliente no encontrado',
          client_company: client ? client.company : null,
          description: contract.description,
          total_hours: contract.total_hours,
          used_hours: usedHours,
          remaining_hours: Math.max(0, remainingHours),
          hourly_rate: contract.hourly_rate,
          total_amount: totalContractValue,
          billed_amount: billedAmount,
          remaining_amount: Math.max(0, remainingAmount),
          progress_percentage: Math.min(100, progress),
          start_date: contract.start_date,
          end_date: contract.end_date,
          last_activity: contractEntries.length > 0 ? 
            Math.max(...contractEntries.map(e => new Date(e.entry_date).getTime())) : null
        };
      });
    
    return res.json({
      success: true,
      data: activeContracts
    });
  }
  
  if (action === 'time-entries') {
    const timeEntries = readData('time_entries.json');
    const contracts = readData('contracts.json');
    const clients = readData('clients.json');
    const projects = readData('projects.json');
    const categories = readData('categories.json');
    
    let filteredEntries = timeEntries;
    
    // Filter by date range
    if (start_date && end_date) {
      filteredEntries = filteredEntries.filter(entry => 
        entry.entry_date >= start_date && entry.entry_date <= end_date
      );
    }
    
    // Enrich entries with related data
    const enrichedEntries = filteredEntries.map(entry => {
      const contract = contracts.find(c => c.id === entry.contract_id);
      const client = contract ? clients.find(c => c.id === contract.client_id) : null;
      const project = projects.find(p => p.id === entry.project_id);
      const category = categories.find(c => c.id === entry.category_id);
      
      return {
        ...entry,
        contract_number: contract ? contract.contract_number : 'N/A',
        client_name: client ? client.name : 'Cliente no encontrado',
        client_company: client ? client.company : null,
        project_name: project ? project.name : null,
        category_name: category ? category.name : 'General',
        hourly_rate: contract ? contract.hourly_rate : 0,
        amount: entry.hours_used * (contract ? contract.hourly_rate : 0)
      };
    });
    
    // Calculate totals
    const totalHours = enrichedEntries.reduce((sum, entry) => sum + (entry.hours_used || 0), 0);
    const totalAmount = enrichedEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    
    return res.json({
      success: true,
      data: enrichedEntries,
      summary: {
        total_entries: enrichedEntries.length,
        total_hours: totalHours,
        total_amount: totalAmount,
        period: { start_date, end_date }
      }
    });
  }
  
  res.json({
    success: false,
    message: 'Acción de reporte no válida'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/api/clients`);
  console.log(`   GET  http://localhost:${PORT}/api/contracts`);
  console.log(`   GET  http://localhost:${PORT}/api/projects`);
  console.log(`   GET  http://localhost:${PORT}/api/categories`);
  console.log(`   GET  http://localhost:${PORT}/api/reports?action=overview`);
  console.log(`   POST http://localhost:${PORT}/api/contracts (for time entries)`);
});