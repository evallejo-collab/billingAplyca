import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  User,
  Building2,
  Search,
  RefreshCw
} from 'lucide-react';

const UserClientManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Data states
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [associations, setAssociations] = useState([]);
  
  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Check if user is admin using AuthContext
  const { isAdmin, checkPermission } = useAuth();
  const userIsAdmin = isAdmin();
  const hasManageUsersPermission = checkPermission('manage_users');

  useEffect(() => {
    // Double check: must be admin AND have manage_users permission
    if (userIsAdmin && hasManageUsersPermission) {
      loadData();
    } else {
      console.log('Access denied - User role:', user?.role, 'IsAdmin:', userIsAdmin, 'HasPermission:', hasManageUsersPermission);
      setError('Solo los administradores pueden acceder a esta funcionalidad');
      setLoading(false);
    }
  }, [user, userIsAdmin, hasManageUsersPermission]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadUsers(),
        loadClients(),
        loadAssociations()
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, role, is_active')
      .order('full_name');
    
    if (error) throw error;
    setUsers(data || []);
  };

  const loadClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, email, contact_person')
      .order('name');
    
    if (error) throw error;
    setClients(data || []);
  };

  const loadAssociations = async () => {
    try {
      // Load associations first
      const { data: associationsData, error: associationsError } = await supabase
        .from('user_client_associations')
        .select('id, user_id, client_id, is_active, created_at')
        .order('created_at', { ascending: false });
      
      if (associationsError) throw associationsError;

      // Then load user and client data separately and combine
      const enrichedAssociations = await Promise.all(
        (associationsData || []).map(async (assoc) => {
          // Get user profile
          const { data: userProfile, error: userError } = await supabase
            .from('user_profiles')
            .select('email, full_name, role')
            .eq('id', assoc.user_id)
            .single();

          // Get client
          const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('name, email')
            .eq('id', assoc.client_id)
            .single();

          return {
            ...assoc,
            user_profiles: userProfile || { 
              email: 'Usuario no encontrado', 
              full_name: 'Usuario no encontrado', 
              role: 'unknown' 
            },
            clients: client || { 
              name: 'Cliente no encontrado', 
              email: 'Cliente no encontrado' 
            }
          };
        })
      );

      setAssociations(enrichedAssociations);
    } catch (err) {
      throw err;
    }
  };

  const handleAddAssociation = async (e) => {
    e.preventDefault();
    if (!selectedUserId || !selectedClientId) {
      setError('Por favor selecciona un usuario y un cliente');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('user_client_associations')
        .insert({
          user_id: selectedUserId,
          client_id: selectedClientId,
          created_by: user.id,
          is_active: true
        });

      if (error) throw error;

      setSuccess('Asociación creada exitosamente');
      setSelectedUserId('');
      setSelectedClientId('');
      setShowAddForm(false);
      await loadAssociations();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAssociation = async (associationId, currentActive) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('user_client_associations')
        .update({ is_active: !currentActive })
        .eq('id', associationId);

      if (error) throw error;

      setSuccess(`Asociación ${!currentActive ? 'activada' : 'desactivada'} exitosamente`);
      await loadAssociations();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssociation = async (associationId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta asociación?')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('user_client_associations')
        .delete()
        .eq('id', associationId);

      if (error) throw error;

      setSuccess('Asociación eliminada exitosamente');
      await loadAssociations();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssociations = associations.filter(assoc =>
    assoc.user_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assoc.user_profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assoc.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableUsers = users.filter(u => u.role !== 'admin' && u.is_active);

  if (!userIsAdmin || !hasManageUsersPermission) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">
            Acceso denegado. Solo los administradores pueden gestionar asociaciones usuario-cliente.
            {user?.role && <div className="text-xs mt-1">Usuario actual: {user.role}</div>}
          </span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Gestión Usuario-Cliente</h1>
          <p className="text-sm text-gray-600 mt-1">Asociar usuarios con clientes específicos</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Asociación
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-green-700">{success}</span>
          </div>
        </div>
      )}

      {/* Add Association Form */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Crear Nueva Asociación</h2>
          <form onSubmit={handleAddAssociation} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuario
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Seleccionar usuario</option>
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email}) - {user.role}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Seleccionar cliente</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Crear Asociación
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar por usuario o cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Associations List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Asociaciones Actuales ({filteredAssociations.length})</h2>
        </div>
        
        {filteredAssociations.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No se encontraron asociaciones</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredAssociations.map((assoc) => (
              <div key={assoc.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${assoc.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <User className={`w-5 h-5 ${assoc.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">{assoc.user_profiles.full_name}</h3>
                      <span className={`px-2 py-1 text-xs rounded ${
                        assoc.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {assoc.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{assoc.user_profiles.email}</p>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-400">
                    <span>→</span>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-medium">{assoc.clients.name}</h3>
                    <p className="text-sm text-gray-500">{assoc.clients.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleAssociation(assoc.id, assoc.is_active)}
                    className={`px-3 py-1 text-sm rounded ${
                      assoc.is_active 
                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    {assoc.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => handleDeleteAssociation(assoc.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserClientManagement;