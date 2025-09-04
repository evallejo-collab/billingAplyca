// Vercel API Route for Projects
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const getDataPath = () => join(process.cwd(), 'data', 'projects.json');
const getClientsPath = () => join(process.cwd(), 'data', 'clients.json');
const getContractsPath = () => join(process.cwd(), 'data', 'contracts.json');
const getTimeEntriesPath = () => join(process.cwd(), 'data', 'time_entries.json');

const readProjects = () => {
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

const readContracts = () => {
  try {
    const data = readFileSync(getContractsPath(), 'utf-8');
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

const writeProjects = (projects) => {
  try {
    writeFileSync(getDataPath(), JSON.stringify(projects, null, 2));
  } catch (error) {
    console.error('Error writing projects:', error);
  }
};

function calculateProjectStats(project, timeEntries) {
  const projectEntries = timeEntries.filter(entry => entry.project_id === project.id);
  const usedHours = projectEntries.reduce((sum, entry) => sum + (entry.hours_used || 0), 0);
  const remainingHours = Math.max(0, (project.estimated_hours || 0) - usedHours);
  
  let currentCost = 0;
  if (project.is_independent && project.hourly_rate) {
    currentCost = usedHours * project.hourly_rate;
  } else {
    // For contract projects, we would need to get the contract's hourly rate
    // For now, we'll use a default or calculate it differently
    currentCost = usedHours * 70000; // Default rate
  }

  return {
    ...project,
    used_hours: usedHours,
    remaining_hours: remainingHours,
    current_cost: currentCost,
    entries_count: projectEntries.length
  };
}

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
            return handleGetProjectSummary(req, res);
          } else {
            return handleGetProject(req, res);
          }
        } else if (query.contract_id) {
          if (query.active_only) {
            return handleGetActiveProjectsForContract(req, res);
          } else {
            return handleGetProjectsByContract(req, res);
          }
        } else if (query.independent) {
          return handleGetIndependentProjects(req, res);
        } else {
          return handleGetAllProjects(req, res);
        }

      case 'POST':
        return handleCreateProject(req, res);

      case 'PUT':
        if (query.id) {
          if (body.action === 'update_payment') {
            return handleUpdatePaymentStatus(req, res);
          } else if (body.status && Object.keys(body).length === 1) {
            return handleUpdateProjectStatus(req, res);
          } else {
            return handleUpdateProject(req, res);
          }
        } else {
          return res.status(400).json({
            success: false,
            message: 'ID de proyecto requerido para actualización'
          });
        }

      case 'DELETE':
        if (query.id) {
          return handleDeleteProject(req, res);
        } else {
          return res.status(400).json({
            success: false,
            message: 'ID de proyecto requerido para eliminación'
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

function handleGetAllProjects(req, res) {
  const projects = readProjects();
  const clients = readClients();
  const contracts = readContracts();
  const timeEntries = readTimeEntries();
  const { status } = req.query;

  let filteredProjects = projects;
  if (status) {
    filteredProjects = projects.filter(project => project.status === status);
  }

  const projectsWithStats = filteredProjects.map(project => {
    const projectWithStats = calculateProjectStats(project, timeEntries);
    
    // Add client and contract information
    let clientName = 'Cliente no encontrado';
    let contractNumber = null;

    if (project.is_independent) {
      clientName = project.client_name || 'Cliente Independiente';
    } else {
      if (project.client_id) {
        const client = clients.find(c => c.id === project.client_id);
        clientName = client ? client.name : 'Cliente no encontrado';
      }
      
      if (project.contract_id) {
        const contract = contracts.find(c => c.id === project.contract_id);
        contractNumber = contract ? contract.contract_number : null;
      }
    }

    return {
      ...projectWithStats,
      client_name: clientName,
      contract_number: contractNumber
    };
  });

  return res.status(200).json({
    success: true,
    projects: projectsWithStats
  });
}

function handleGetIndependentProjects(req, res) {
  const projects = readProjects();
  const timeEntries = readTimeEntries();
  const { status } = req.query;

  let independentProjects = projects.filter(project => project.is_independent);
  
  if (status) {
    independentProjects = independentProjects.filter(project => project.status === status);
  }

  const projectsWithStats = independentProjects.map(project => 
    calculateProjectStats(project, timeEntries)
  );

  return res.status(200).json({
    success: true,
    projects: projectsWithStats
  });
}

function handleGetProject(req, res) {
  const { id } = req.query;
  const projects = readProjects();
  const timeEntries = readTimeEntries();
  
  const project = projects.find(p => p.id === parseInt(id));

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }

  const projectWithStats = calculateProjectStats(project, timeEntries);

  return res.status(200).json({
    success: true,
    project: projectWithStats
  });
}

function handleGetProjectsByContract(req, res) {
  const { contract_id } = req.query;
  const projects = readProjects();
  const timeEntries = readTimeEntries();
  
  const contractProjects = projects.filter(p => p.contract_id === parseInt(contract_id));
  const projectsWithStats = contractProjects.map(project => 
    calculateProjectStats(project, timeEntries)
  );

  return res.status(200).json({
    success: true,
    projects: projectsWithStats
  });
}

function handleGetActiveProjectsForContract(req, res) {
  const { contract_id } = req.query;
  const projects = readProjects();
  const timeEntries = readTimeEntries();
  
  const activeProjects = projects.filter(p => 
    p.contract_id === parseInt(contract_id) && 
    p.status === 'active' && 
    !p.is_independent
  );
  
  const projectsWithStats = activeProjects.map(project => {
    const projectWithStats = calculateProjectStats(project, timeEntries);
    // Only return projects with remaining hours
    return projectWithStats.remaining_hours > 0 ? projectWithStats : null;
  }).filter(Boolean);

  return res.status(200).json({
    success: true,
    projects: projectsWithStats
  });
}

function handleCreateProject(req, res) {
  const projects = readProjects();
  
  const newProject = {
    id: Math.max(...projects.map(p => p.id), 0) + 1,
    contract_id: req.body.contract_id || null,
    client_id: req.body.client_id || null,
    independent_client_id: req.body.independent_client_id || null,
    name: req.body.name,
    description: req.body.description || null,
    estimated_hours: req.body.estimated_hours ? parseFloat(req.body.estimated_hours) : null,
    hourly_rate: req.body.hourly_rate ? parseFloat(req.body.hourly_rate) : null,
    total_amount: req.body.total_amount ? parseFloat(req.body.total_amount) : null,
    is_independent: req.body.is_independent || false,
    client_name: req.body.client_name || null,
    client_email: req.body.client_email || null,
    client_phone: req.body.client_phone || null,
    is_paid: req.body.is_paid || false,
    payment_date: req.body.payment_date || null,
    payment_method: req.body.payment_method || null,
    invoice_number: req.body.invoice_number || null,
    notes: req.body.notes || null,
    status: req.body.status || 'active',
    start_date: req.body.start_date || null,
    end_date: req.body.end_date || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Basic validation
  if (!newProject.name) {
    return res.status(400).json({
      success: false,
      message: 'El nombre del proyecto es requerido'
    });
  }

  projects.push(newProject);
  writeProjects(projects);

  return res.status(201).json({
    success: true,
    message: 'Proyecto creado exitosamente',
    project: newProject
  });
}

function handleUpdateProject(req, res) {
  const { id } = req.query;
  const projects = readProjects();
  const projectIndex = projects.findIndex(p => p.id === parseInt(id));

  if (projectIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }

  const updatedProject = {
    ...projects[projectIndex],
    name: req.body.name || projects[projectIndex].name,
    description: req.body.description !== undefined ? req.body.description : projects[projectIndex].description,
    estimated_hours: req.body.estimated_hours ? parseFloat(req.body.estimated_hours) : projects[projectIndex].estimated_hours,
    start_date: req.body.start_date !== undefined ? req.body.start_date : projects[projectIndex].start_date,
    end_date: req.body.end_date !== undefined ? req.body.end_date : projects[projectIndex].end_date,
    status: req.body.status || projects[projectIndex].status,
    updated_at: new Date().toISOString()
  };

  projects[projectIndex] = updatedProject;
  writeProjects(projects);

  return res.status(200).json({
    success: true,
    message: 'Proyecto actualizado exitosamente',
    project: updatedProject
  });
}

function handleUpdateProjectStatus(req, res) {
  const { id } = req.query;
  const projects = readProjects();
  const projectIndex = projects.findIndex(p => p.id === parseInt(id));

  if (projectIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }

  projects[projectIndex].status = req.body.status;
  projects[projectIndex].updated_at = new Date().toISOString();
  
  writeProjects(projects);

  return res.status(200).json({
    success: true,
    message: 'Estado del proyecto actualizado exitosamente'
  });
}

function handleUpdatePaymentStatus(req, res) {
  const { id } = req.query;
  const projects = readProjects();
  const projectIndex = projects.findIndex(p => p.id === parseInt(id));

  if (projectIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }

  if (!projects[projectIndex].is_independent) {
    return res.status(400).json({
      success: false,
      message: 'Solo se puede actualizar el estado de pago de proyectos independientes'
    });
  }

  projects[projectIndex].is_paid = req.body.is_paid || false;
  projects[projectIndex].payment_date = req.body.payment_date || null;
  projects[projectIndex].payment_method = req.body.payment_method || null;
  projects[projectIndex].invoice_number = req.body.invoice_number || null;
  projects[projectIndex].updated_at = new Date().toISOString();
  
  writeProjects(projects);

  return res.status(200).json({
    success: true,
    message: 'Estado de pago actualizado exitosamente'
  });
}

function handleDeleteProject(req, res) {
  const { id } = req.query;
  const projects = readProjects();
  const timeEntries = readTimeEntries();
  
  const projectIndex = projects.findIndex(p => p.id === parseInt(id));

  if (projectIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }

  // Check if project has time entries
  const hasTimeEntries = timeEntries.some(entry => entry.project_id === parseInt(id));
  if (hasTimeEntries) {
    return res.status(400).json({
      success: false,
      message: 'No se puede eliminar el proyecto porque tiene entradas de tiempo asociadas'
    });
  }

  projects.splice(projectIndex, 1);
  writeProjects(projects);

  return res.status(200).json({
    success: true,
    message: 'Proyecto eliminado exitosamente'
  });
}

function handleGetProjectSummary(req, res) {
  const { id } = req.query;
  const projects = readProjects();
  const clients = readClients();
  const contracts = readContracts();
  const timeEntries = readTimeEntries();
  
  const project = projects.find(p => p.id === parseInt(id));

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Proyecto no encontrado'
    });
  }

  const projectWithStats = calculateProjectStats(project, timeEntries);
  
  // Add additional summary information
  let clientInfo = {};
  if (project.is_independent) {
    clientInfo = {
      client_name: project.client_name,
      client_email: project.client_email,
      client_phone: project.client_phone
    };
  } else {
    if (project.client_id) {
      const client = clients.find(c => c.id === project.client_id);
      if (client) {
        clientInfo = {
          client_name: client.name,
          client_email: client.email,
          client_phone: client.phone
        };
      }
    }
    
    if (project.contract_id) {
      const contract = contracts.find(c => c.id === project.contract_id);
      if (contract) {
        clientInfo.contract_number = contract.contract_number;
        clientInfo.contract_hourly_rate = contract.hourly_rate;
      }
    }
  }

  const summary = {
    ...projectWithStats,
    ...clientInfo
  };

  return res.status(200).json({
    success: true,
    summary
  });
}