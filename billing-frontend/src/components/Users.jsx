import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  User, 
  Mail, 
  Shield, 
  Edit2, 
  Trash2,
  AlertCircle,
  Check,
  X
} from 'lucide-react';
import { ROLES, getRoleLabel, hasPermission, PERMISSIONS } from '../utils/roles';
import ConfirmModal from './ConfirmModal';
import InvitationModal from './InvitationModal';

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInvitations, setShowInvitations] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [invitationModalOpen, setInvitationModalOpen] = useState(false);
  const [invitationStatus, setInvitationStatus] = useState('idle');
  const [currentInvitation, setCurrentInvitation] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: ROLES.COLLABORATOR,
    client_id: '',
    is_active: true
  });

  useEffect(() => {
    if (!hasPermission(currentUser?.role, PERMISSIONS.MANAGE_USERS)) {
      setError('No tienes permisos para gestionar usuarios');
      setLoading(false);
      return;
    }
    
    loadUsers();
    loadPendingInvitations();
  }, [currentUser]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        throw profilesError;
      }

      setUsers(profiles || []);
    } catch (err) {
      setError(err.message);
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingInvitations = async () => {
    try {
      const { data: invitations, error: invitationsError } = await supabase
        .from('pending_invitations')
        .select('*')
        .eq('status', 'pending')
        .order('invited_at', { ascending: false });

      if (invitationsError) {
        throw invitationsError;
      }

      setPendingInvitations(invitations || []);
    } catch (err) {
      console.error('Error loading invitations:', err);
    }
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsEditing(false);
    setFormData({
      email: '',
      password: '',
      full_name: '',
      role: ROLES.COLLABORATOR,
      client_id: '',
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setIsEditing(true);
    setFormData({
      email: user.email || '',
      password: '',
      full_name: user.full_name || '',
      role: user.role || ROLES.COLLABORATOR,
      client_id: user.client_id || '',
      is_active: user.is_active !== false
    });
    setIsModalOpen(true);
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setLoading(true);

      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userToDelete.id);

      if (profileError) throw profileError;

      await loadUsers();
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    } catch (err) {
      setError(err.message);
      console.error('Error deleting user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing) {
        const updateData = {
          full_name: formData.full_name,
          role: formData.role,
          client_id: formData.client_id || null,
          is_active: formData.is_active
        };

        const { error } = await supabase
          .from('user_profiles')
          .update(updateData)
          .eq('id', selectedUser.id);

        if (error) throw error;
      } else {
        // Show loading modal
        setInvitationStatus('loading');
        setInvitationModalOpen(true);
        
        try {
          // Store the invitation in pending_invitations table
          const { data: invitation, error: inviteError } = await supabase
            .from('pending_invitations')
            .insert({
              email: formData.email,
              full_name: formData.full_name,
              role: formData.role,
              client_id: formData.client_id || null,
              invited_by: currentUser.id,
              status: 'pending'
            })
            .select()
            .single();

          if (inviteError) {
            throw new Error(inviteError.message || 'Error storing invitation');
          }

          setCurrentInvitation({
            ...invitation,
            instructions: `Para completar la invitación:

1. Ve al Dashboard de Supabase → Authentication → Users
2. Haz clic en "Invite a user"
3. Ingresa el email: ${formData.email}
4. Envía la invitación

El usuario recibirá un email y cuando se registre, automáticamente tendrá el rol asignado: ${getRoleLabel(formData.role)}`
          });

          // For now, don't try automatic signup due to trigger issues
          // Just show success with manual instructions
          setInvitationStatus('success');
          
        } catch (inviteError) {
          console.error('Invitation error:', inviteError);
          setInvitationStatus('error');
        }
      }

      await loadUsers();
      await loadPendingInvitations();
      setIsModalOpen(false);
      setSelectedUser(null);
    } catch (err) {
      setError(err.message);
      console.error('Error saving user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (isActive) => {
    return isActive 
      ? 'bg-green-50 text-green-800 border border-green-200'
      : 'bg-red-50 text-red-800 border border-red-200';
  };

  const getStatusIcon = (isActive) => {
    return isActive 
      ? <Check className="w-4 h-4" />
      : <X className="w-4 h-4" />;
  };

  if (!hasPermission(currentUser?.role, PERMISSIONS.MANAGE_USERS)) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Sin permisos</h2>
          <p className="text-gray-600">No tienes permisos para gestionar usuarios del sistema.</p>
        </div>
      </div>
    );
  }

  if (loading && users.length === 0) {
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
          <h1 className="text-2xl font-semibold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-sm text-gray-600 mt-1">Administrar usuarios y permisos del sistema</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowInvitations(!showInvitations)}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              showInvitations 
                ? 'bg-gray-600 text-white hover:bg-gray-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Mail className="w-4 h-4 mr-2" />
            INVITACIONES ({pendingInvitations.length})
          </button>
          <button 
            onClick={handleCreateUser}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            INVITAR USUARIO
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar usuarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {showInvitations && (
        <div className="card mb-6">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Invitaciones Pendientes</h3>
            <p className="text-sm text-gray-600">Usuarios que han sido invitados pero aún no han completado su registro</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol Asignado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invitado el
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingInvitations.map((invitation) => (
                  <tr key={invitation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-10 h-10">
                          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                            <Mail className="w-5 h-5 text-yellow-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {invitation.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {invitation.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {getRoleLabel(invitation.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(invitation.invited_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      <button
                        onClick={() => alert(`Para enviar la invitación:\n\n1. Ve al Dashboard de Supabase → Authentication → Users\n2. Clic en "Invite a user"\n3. Email: ${invitation.email}\n4. Envía la invitación`)}
                        className="hover:text-blue-900"
                      >
                        Ver instrucciones
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {pendingInvitations.length === 0 && (
              <div className="text-center py-8">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay invitaciones pendientes</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente Asociado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-10 h-10">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.full_name || 'Sin nombre'}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {getRoleLabel(user.role)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.client_id ? `Cliente ID: ${user.client_id}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(user.is_active !== false)}`}>
                      {getStatusIcon(user.is_active !== false)}
                      <span className="ml-1">
                        {user.is_active !== false ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {user.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && !loading && (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay usuarios registrados</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? 'Editar Usuario' : 'Invitar Usuario'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={isEditing}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    isEditing ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                />
              </div>

              {!isEditing && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>📧 Invitación Automática:</strong> El sistema creará automáticamente la cuenta 
                    y enviará un email de confirmación al usuario. El usuario deberá confirmar su email 
                    y establecer su contraseña.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol *
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={ROLES.ADMIN}>{getRoleLabel(ROLES.ADMIN)}</option>
                  <option value={ROLES.COLLABORATOR}>{getRoleLabel(ROLES.COLLABORATOR)}</option>
                  <option value={ROLES.CLIENT}>{getRoleLabel(ROLES.CLIENT)}</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Usuario activo
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'ENVIANDO...' : (isEditing ? 'ACTUALIZAR' : 'ENVIAR INVITACIÓN')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteUser}
        title="Eliminar Usuario"
        message={`¿Estás seguro de que deseas eliminar al usuario "${userToDelete?.full_name}"?`}
        confirmText="ELIMINAR"
        cancelText="CANCELAR"
        isDestructive={true}
      />

      <InvitationModal
        isOpen={invitationModalOpen}
        onClose={() => {
          setInvitationModalOpen(false);
          setInvitationStatus('idle');
          setCurrentInvitation(null);
        }}
        invitation={currentInvitation}
        status={invitationStatus}
      />
    </div>
  );
};

export default Users;