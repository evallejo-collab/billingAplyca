import axios from 'axios';

// Base API URL - using local server for development
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Add session ID to requests and prevent caching
api.interceptors.request.use((config) => {
  const sessionId = localStorage.getItem('sessionId');
  if (sessionId) {
    config.headers['x-session-id'] = sessionId;
  }
  
  // Prevent caching for GET requests
  if (config.method === 'get') {
    config.params = {
      ...config.params,
      _t: Date.now()
    };
  }
  
  return config;
});

// Handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear session data
      localStorage.removeItem('sessionId');
      localStorage.removeItem('user');
      // Reload the page to trigger AuthProvider to show login
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// API service functions
export const contractsApi = {
  // Get all contracts
  getAll: (status = null) => {
    const params = status ? { status } : {};
    return api.get('/contracts', { params });
  },

  // Get contract by ID
  getById: (id) => {
    return api.get(`/contracts/${id}`);
  },

  // Get contracts by client
  getByClient: (clientId) => {
    return api.get('/contracts', { params: { client_id: clientId } });
  },

  // Create new contract
  create: (contractData) => {
    return api.post('/contracts', contractData);
  },

  // Update contract status
  updateStatus: (id, status) => {
    return api.put(`/contracts/${id}`, { status });
  },

  // Add time entry to contract or independent project
  addTimeEntry: (timeEntryData) => {
    return api.post('/contracts', {
      action: 'add_time_entry',
      ...timeEntryData
    });
  },
  // Add payment to contract
  addPayment: (id, data) => api.post(`/contracts/${id}/payment`, data),

  // Update contract
  update: (id, contractData) => {
    return api.put(`/contracts/${id}`, contractData);
  },

  // Delete contract
  delete: (id, force = false) => {
    const url = force ? `/contracts/${id}?force=true` : `/contracts/${id}`;
    return api.delete(url);
  },
};

export const timeEntriesApi = {
  // Get all time entries
  getAll: () => {
    return api.get('/time-entries');
  },

  // Get time entries by contract
  getByContract: (contractId) => {
    return api.get('/time-entries', { params: { contract_id: contractId } });
  },

  // Get time entries by date range
  getByDateRange: (startDate, endDate, contractId = null) => {
    const params = { start_date: startDate, end_date: endDate };
    if (contractId) params.contract_id = contractId;
    return api.get('/time-entries', { params });
  },

  // Update time entry
  update: (id, timeEntryData) => {
    return api.put(`/time-entries/${id}`, timeEntryData);
  },

  // Delete time entry
  delete: (id) => {
    return api.delete(`/time-entries/${id}`);
  },
};

export const projectsApi = {
  // Get all projects
  getAll: (status = null) => {
    const params = status ? { status } : {};
    return api.get('/projects', { params });
  },

  // Get independent projects
  getIndependent: (status = null) => {
    const params = { independent: true };
    if (status) params.status = status;
    return api.get('/projects', { params });
  },

  // Get project by ID
  getById: (id, includeSummary = false) => {
    const params = { id };
    if (includeSummary) params.summary = true;
    return api.get('/projects', { params });
  },

  // Get projects by contract
  getByContract: (contractId, activeOnly = false) => {
    const params = { contract_id: contractId };
    if (activeOnly) params.active_only = true;
    return api.get('/projects', { params });
  },

  // Create new project
  create: (projectData) => {
    return api.post('/projects', projectData);
  },

  // Update project
  update: (id, projectData) => {
    return api.put(`/projects/${id}`, projectData);
  },

  // Update project status
  updateStatus: (id, status) => {
    return api.put(`/projects/${id}`, { status });
  },

  // Update payment status (for independent projects)
  updatePaymentStatus: (id, paymentData) => {
    return api.put(`/projects/${id}`, {
      action: 'update_payment',
      ...paymentData
    });
  },

  // Delete project
  delete: (id) => {
    return api.delete(`/projects/${id}`);
  },
  // Add payment to project
  addPayment: (id, data) => api.post(`/projects/${id}/payment`, data)
};

export const categoriesApi = {
  // Get all categories
  getAll: (includeInactive = false) => {
    const params = includeInactive ? { include_inactive: true } : {};
    return api.get('/categories', { params });
  },

  // Get category by ID
  getById: (id) => {
    return api.get(`/categories/${id}`);
  },

  // Get category usage statistics
  getStats: (contractId = null, year = null, month = null) => {
    const params = { stats: true };
    if (contractId) params.contract_id = contractId;
    if (year && month) {
      params.year = year;
      params.month = month;
    }
    return api.get('/categories', { params });
  },

  // Create new category
  create: (categoryData) => {
    return api.post('/categories', categoryData);
  },

  // Update category
  update: (id, categoryData) => {
    return api.put(`/categories/${id}`, categoryData);
  },

  // Toggle category active status
  toggleActive: (id) => {
    return api.put(`/categories/${id}`, { toggle_active: true });
  },
};

// Clients API
export const clientsApi = {
  // Get all clients
  getAll: () => {
    return api.get('/clients');
  },

  // Get client by ID
  getById: (id) => {
    return api.get(`/clients/${id}`);
  },

  // Get client summary with contracts and projects
  getSummary: (id) => {
    return api.get('/clients', { params: { id, summary: true } });
  },

  // Get client contracts
  getContracts: (id) => {
    return api.get('/clients', { params: { id, contracts: true } });
  },

  // Get client projects
  getProjects: (id) => {
    return api.get('/clients', { params: { id, projects: true } });
  },

  // Create new client
  create: (clientData) => {
    return api.post('/clients', clientData);
  },

  // Update client
  update: (id, clientData) => {
    return api.put(`/clients/${id}`, clientData);
  },

  // Delete client
  delete: (id, force = false) => {
    const url = force ? `/clients/${id}?force=true` : `/clients/${id}`;
    return api.delete(url);
  },

  // Search clients
  search: (searchTerm) => {
    return api.get('/clients', { params: { search: searchTerm } });
  },
};

// Independent Clients API
export const independentClientsApi = {
  // Get all independent clients
  getAll: () => {
    return api.get('/independent-clients');
  },

  // Get independent client by ID
  getById: (id) => {
    return api.get('/independent-clients', { params: { id } });
  },

  // Create new independent client
  create: (clientData) => {
    return api.post('/independent-clients', clientData);
  },

  // Update independent client
  update: (id, clientData) => {
    return api.put(`/independent-clients/${id}`, clientData);
  },

  // Delete independent client
  delete: (id) => {
    return api.delete(`/independent-clients/${id}`);
  },

  // Get client projects
  getProjects: (clientId) => {
    return api.get('/independent-clients', { params: { id: clientId, projects: true } });
  },
};

// Payments API
export const paymentsApi = {
  // Get payments by contract or project
  getByContract: (contractId) => {
    return api.get('/payments', { params: { contract_id: contractId } });
  },
  
  getByProject: (projectId) => {
    return api.get('/payments', { params: { project_id: projectId } });
  },
  
  // Get all payments
  getAll: () => {
    return api.get('/payments');
  },
  
  // Update payment by ID
  update: (paymentId, paymentData) => {
    return api.put(`/payments/${paymentId}`, paymentData);
  },
  
  // Delete payment by ID
  delete: (paymentId) => {
    return api.delete(`/payments/${paymentId}`);
  }
};

export const reportsApi = {
  // Get overview statistics
  getOverview: () => {
    return api.get('/reports', { params: { action: 'overview' } });
  },

  // Get monthly billing report
  getMonthly: (year, month) => {
    return api.get('/reports', { 
      params: { action: 'monthly', year, month } 
    });
  },

  // Get client billing report
  getClient: (clientId, startDate = null, endDate = null) => {
    const params = { action: 'client', client_id: clientId };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return api.get('/reports', { params });
  },

  // Get active contracts report
  getActiveContracts: () => {
    return api.get('/reports', { params: { action: 'active_contracts' } });
  },

  // Get time entries report
  getTimeEntries: (startDate, endDate, contractId = null, projectId = null) => {
    const params = { action: 'time-entries', start_date: startDate, end_date: endDate };
    if (contractId) params.contract_id = contractId;
    if (projectId) params.project_id = projectId;
    return api.get('/reports', { params });
  },

  // Get independent projects financial summary
  getIndependentFinancials: () => {
    return api.get('/reports', { params: { action: 'independent_financials' } });
  },

  // Get client report
  getClientReport: (clientId, startDate = null, endDate = null) => {
    const params = { action: 'client_report', client_id: clientId };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return api.get('/reports', { params });
  },
};

// Users API
export const usersApi = {
  // Get all users
  getAll: () => {
    return api.get('/users');
  },

  // Get user by ID
  getById: (id) => {
    return api.get(`/users/${id}`);
  },

  // Create new user
  create: (userData) => {
    return api.post('/users', userData);
  },

  // Update user
  update: (id, userData) => {
    return api.put(`/users/${id}`, userData);
  },

  // Delete user
  delete: (id) => {
    return api.delete(`/users/${id}`);
  },
};

// Authentication API
export const authApi = {
  // Login
  login: (username, password) => {
    return api.post('/auth/login', { username, password });
  },

  // Logout
  logout: () => {
    return api.post('/auth/logout');
  },

  // Get current user info
  me: () => {
    return api.get('/auth/me');
  },
};

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const message = error.response.data?.message || 'Error en el servidor';
      throw new Error(message);
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('No se pudo conectar con el servidor');
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error('Error en la solicitud');
    }
  }
);

export default api;