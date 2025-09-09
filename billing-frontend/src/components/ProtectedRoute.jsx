import { useAuth } from '../context/AuthContext';
import { hasPermission, getAllowedRoutes } from '../utils/roles';
import { AlertCircle, Shield, Lock } from 'lucide-react';

const ProtectedRoute = ({ children, requiredPermission = null, fallback = null }) => {
  const { user, loading, isAuthenticated } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // User not authenticated
  if (!isAuthenticated()) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Lock className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Acceso Restringido</h2>
          <p className="text-gray-600">Debes iniciar sesión para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  // User account is inactive
  if (user?.is_active === false) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Cuenta Inactiva</h2>
          <p className="text-gray-600">Tu cuenta ha sido desactivada. Contacta al administrador.</p>
        </div>
      </div>
    );
  }

  // Check specific permission if required
  if (requiredPermission && !hasPermission(user?.role, requiredPermission)) {
    // Show custom fallback if provided
    if (fallback) {
      return fallback;
    }

    // Default permission denied view
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Sin Permisos</h2>
          <p className="text-gray-600">No tienes permisos para acceder a esta funcionalidad.</p>
          <p className="text-sm text-gray-500 mt-2">
            Contacta al administrador si consideras que deberías tener acceso.
          </p>
        </div>
      </div>
    );
  }

  // All checks passed, render the protected content
  return children;
};

// Higher-order component for protecting entire route components
export const withProtectedRoute = (Component, requiredPermission = null) => {
  return function ProtectedComponent(props) {
    return (
      <ProtectedRoute requiredPermission={requiredPermission}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
};

// Specific protection components for common use cases
export const AdminOnly = ({ children }) => (
  <ProtectedRoute requiredPermission="manage_system">
    {children}
  </ProtectedRoute>
);

export const CollaboratorOnly = ({ children }) => {
  const { user } = useAuth();
  
  if (!user || (user.role !== 'admin' && user.role !== 'collaborator')) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Solo para Colaboradores</h2>
          <p className="text-gray-600">Esta funcionalidad está reservada para colaboradores de Aplyca.</p>
        </div>
      </div>
    );
  }
  
  return children;
};

export const ClientRestricted = ({ children, clientId = null }) => {
  const { user } = useAuth();
  
  // Admins and collaborators can see everything
  if (user?.role === 'admin' || user?.role === 'collaborator') {
    return children;
  }
  
  // Clients can only see their own data
  if (user?.role === 'client') {
    if (clientId && user?.client_id && user.client_id !== clientId) {
      return (
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <Lock className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Acceso Restringido</h2>
            <p className="text-gray-600">Solo puedes ver información relacionada con tu empresa.</p>
          </div>
        </div>
      );
    }
    return children;
  }
  
  return (
    <div className="flex items-center justify-center min-h-64">
      <div className="text-center">
        <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Sin Permisos</h2>
        <p className="text-gray-600">No tienes permisos para acceder a esta información.</p>
      </div>
    </div>
  );
};

export default ProtectedRoute;