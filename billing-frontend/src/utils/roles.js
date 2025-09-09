// Definición de roles del sistema
export const ROLES = {
  ADMIN: 'admin',           // Colaborador Aplyca con acceso completo
  COLLABORATOR: 'collaborator', // Colaborador Aplyca con acceso limitado
  CLIENT: 'client'          // Cliente externo con acceso muy limitado
};

// Definición de permisos del sistema
export const PERMISSIONS = {
  // Dashboard
  VIEW_DASHBOARD: 'view_dashboard',
  
  // Clientes
  VIEW_CLIENTS: 'view_clients',
  CREATE_CLIENTS: 'create_clients',
  EDIT_CLIENTS: 'edit_clients',
  DELETE_CLIENTS: 'delete_clients',
  
  // Contratos
  VIEW_CONTRACTS: 'view_contracts',
  CREATE_CONTRACTS: 'create_contracts',
  EDIT_CONTRACTS: 'edit_contracts',
  DELETE_CONTRACTS: 'delete_contracts',
  
  // Proyectos
  VIEW_PROJECTS: 'view_projects',
  CREATE_PROJECTS: 'create_projects',
  EDIT_PROJECTS: 'edit_projects',
  DELETE_PROJECTS: 'delete_projects',
  
  // Registro de Tiempo
  VIEW_TIME_ENTRIES: 'view_time_entries',
  CREATE_TIME_ENTRIES: 'create_time_entries',
  EDIT_TIME_ENTRIES: 'edit_time_entries',
  DELETE_TIME_ENTRIES: 'delete_time_entries',
  VIEW_ALL_TIME_ENTRIES: 'view_all_time_entries', // Ver entradas de otros usuarios
  
  // Pagos/Billing
  VIEW_PAYMENTS: 'view_payments',
  CREATE_PAYMENTS: 'create_payments',
  EDIT_PAYMENTS: 'edit_payments',
  DELETE_PAYMENTS: 'delete_payments',
  
  // Reportes
  VIEW_REPORTS: 'view_reports',
  VIEW_MONTHLY_REPORTS: 'view_monthly_reports',
  VIEW_CONTRACT_REPORTS: 'view_contract_reports',
  VIEW_PROJECT_REPORTS: 'view_project_reports',
  VIEW_TIME_REPORTS: 'view_time_reports',
  
  // Administración
  MANAGE_USERS: 'manage_users',
  MANAGE_SYSTEM: 'manage_system'
};

// Mapeo de roles a permisos
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    // Dashboard completo
    PERMISSIONS.VIEW_DASHBOARD,
    
    // Clientes - acceso completo
    PERMISSIONS.VIEW_CLIENTS,
    PERMISSIONS.CREATE_CLIENTS,
    PERMISSIONS.EDIT_CLIENTS,
    PERMISSIONS.DELETE_CLIENTS,
    
    // Contratos - acceso completo
    PERMISSIONS.VIEW_CONTRACTS,
    PERMISSIONS.CREATE_CONTRACTS,
    PERMISSIONS.EDIT_CONTRACTS,
    PERMISSIONS.DELETE_CONTRACTS,
    
    // Proyectos - acceso completo
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.CREATE_PROJECTS,
    PERMISSIONS.EDIT_PROJECTS,
    PERMISSIONS.DELETE_PROJECTS,
    
    // Tiempo - acceso completo
    PERMISSIONS.VIEW_TIME_ENTRIES,
    PERMISSIONS.CREATE_TIME_ENTRIES,
    PERMISSIONS.EDIT_TIME_ENTRIES,
    PERMISSIONS.DELETE_TIME_ENTRIES,
    PERMISSIONS.VIEW_ALL_TIME_ENTRIES,
    
    // Pagos - acceso completo
    PERMISSIONS.VIEW_PAYMENTS,
    PERMISSIONS.CREATE_PAYMENTS,
    PERMISSIONS.EDIT_PAYMENTS,
    PERMISSIONS.DELETE_PAYMENTS,
    
    // Reportes - acceso completo
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_MONTHLY_REPORTS,
    PERMISSIONS.VIEW_CONTRACT_REPORTS,
    PERMISSIONS.VIEW_PROJECT_REPORTS,
    PERMISSIONS.VIEW_TIME_REPORTS,
    
    // Administración
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_SYSTEM
  ],
  
  [ROLES.COLLABORATOR]: [
    // Dashboard completo
    PERMISSIONS.VIEW_DASHBOARD,
    
    // Clientes - solo lectura
    PERMISSIONS.VIEW_CLIENTS,
    
    // Contratos - solo lectura
    PERMISSIONS.VIEW_CONTRACTS,
    
    // Proyectos - acceso completo
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.CREATE_PROJECTS,
    PERMISSIONS.EDIT_PROJECTS,
    
    // Tiempo - acceso completo para sus entradas
    PERMISSIONS.VIEW_TIME_ENTRIES,
    PERMISSIONS.CREATE_TIME_ENTRIES,
    PERMISSIONS.EDIT_TIME_ENTRIES,
    PERMISSIONS.DELETE_TIME_ENTRIES,
    
    // Pagos - solo lectura
    PERMISSIONS.VIEW_PAYMENTS,
    
    // Reportes - acceso completo
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_MONTHLY_REPORTS,
    PERMISSIONS.VIEW_CONTRACT_REPORTS,
    PERMISSIONS.VIEW_PROJECT_REPORTS,
    PERMISSIONS.VIEW_TIME_REPORTS
  ],
  
  [ROLES.CLIENT]: [
    // Solo reportes limitados - tiempo y análisis de sus proyectos
    PERMISSIONS.VIEW_TIME_REPORTS
  ]
};

// Función para verificar si un usuario tiene un permiso específico
export const hasPermission = (userRole, permission) => {
  if (!userRole || !permission) return false;
  
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission);
};

// Función para verificar múltiples permisos (requiere todos)
export const hasAllPermissions = (userRole, permissions) => {
  if (!Array.isArray(permissions)) return false;
  
  return permissions.every(permission => hasPermission(userRole, permission));
};

// Función para verificar si tiene alguno de varios permisos
export const hasAnyPermission = (userRole, permissions) => {
  if (!Array.isArray(permissions)) return false;
  
  return permissions.some(permission => hasPermission(userRole, permission));
};

// Función para obtener todas las rutas permitidas para un rol
export const getAllowedRoutes = (userRole) => {
  const routes = [];
  
  if (hasPermission(userRole, PERMISSIONS.VIEW_DASHBOARD)) {
    routes.push('/dashboard');
  }
  
  if (hasPermission(userRole, PERMISSIONS.VIEW_CLIENTS)) {
    routes.push('/clients');
  }
  
  if (hasPermission(userRole, PERMISSIONS.VIEW_CONTRACTS)) {
    routes.push('/contracts');
  }
  
  if (hasPermission(userRole, PERMISSIONS.VIEW_PROJECTS)) {
    routes.push('/projects');
  }
  
  if (hasPermission(userRole, PERMISSIONS.VIEW_TIME_ENTRIES)) {
    routes.push('/time-entries');
  }
  
  if (hasPermission(userRole, PERMISSIONS.VIEW_PAYMENTS)) {
    routes.push('/billing');
  }
  
  if (hasPermission(userRole, PERMISSIONS.VIEW_REPORTS)) {
    routes.push('/reports');
  }
  
  if (hasPermission(userRole, PERMISSIONS.MANAGE_USERS)) {
    routes.push('/users');
  }
  
  return routes;
};

// Función para obtener el label de un rol
export const getRoleLabel = (role) => {
  switch (role) {
    case ROLES.ADMIN:
      return 'Administrador Aplyca';
    case ROLES.COLLABORATOR:
      return 'Colaborador Aplyca';
    case ROLES.CLIENT:
      return 'Cliente';
    default:
      return 'Sin rol asignado';
  }
};