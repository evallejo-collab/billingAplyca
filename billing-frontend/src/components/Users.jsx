import { useState, useEffect } from 'react';
import { usersApi } from '../services/supabaseApi';
import UserModal from './UserModal';
import { 
  Users as UsersIcon, 
  Search, 
  AlertCircle,
  Mail,
  Calendar,
  Shield,
  User,
  Plus
} from 'lucide-react';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading users...');
      const response = await usersApi.getAll();
      console.log('Users loaded:', response);
      setUsers(response.data);
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUserCreated = (success, message) => {
    if (success) {
      setSuccessMessage(message || 'Usuario creado exitosamente');
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } else {
      setError(message || 'Error al crear usuario');
      // Clear error message after 5 seconds
      setTimeout(() => setError(null), 5000);
    }
    loadUsers();
    setIsModalOpen(false);
  };

  const filteredUsers = users.filter(user =>
    !searchTerm || 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando usuarios...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-sm text-gray-600 mt-1">Crear y gestionar usuarios del sistema</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-3 h-3 mr-1" />
          CREAR USUARIO
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-body">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>


      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-green-500 mr-2">✅</div>
            <p className="text-green-700 text-sm font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Usuarios Registrados ({filteredUsers.length})
          </h3>
        </div>
        
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm ? 'No se encontraron usuarios' : 'Solo se muestra el usuario actual'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm 
                ? 'Intenta con otros términos de búsqueda'
                : 'Por limitaciones de seguridad, solo puedes ver tu propio usuario desde el frontend'
              }
            </p>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                ℹ️ Los nuevos usuarios se crean exitosamente en Supabase Auth, pero solo son visibles desde el panel de administración de Supabase.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <div key={user.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.full_name || user.username || 'Sin nombre'}
                        </p>
                        {user.role === 'admin' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </span>
                        )}
                      </div>
                      {user.email && (
                        <div className="flex items-center mt-1">
                          <Mail className="w-3 h-3 text-gray-400 mr-1" />
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {user.created_at && (
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="w-3 h-3 mr-1" />
                        Registrado: {new Date(user.created_at).toLocaleDateString('es-CO')}
                      </div>
                    )}
                    {user.last_sign_in_at && (
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <User className="w-3 h-3 mr-1" />
                        Último acceso: {new Date(user.last_sign_in_at).toLocaleDateString('es-CO')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Creation Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUserCreated={handleUserCreated}
      />
    </div>
  );
};

export default Users;