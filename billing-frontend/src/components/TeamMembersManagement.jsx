import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, User, Mail, Clock, Building, AlertTriangle, CheckCircle, X, RefreshCw } from 'lucide-react';
import { capacityApi } from '../services/supabaseApi';

const TeamMembersManagement = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [notification, setNotification] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Developer',
    weekly_capacity: 40,
    hourly_rate: 0,
    department: 'Development',
    hire_date: '',
    skills: '',
    notes: ''
  });

  const departments = ['Development', 'Infrastructure', 'Quality', 'Design', 'Management'];
  const roles = ['Developer', 'Senior Developer', 'Tech Lead', 'Architect', 'DevOps', 'Tester', 'Designer', 'Manager'];

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      console.log('Loading team members...');
      const response = await capacityApi.getAllTeamMembers();
      console.log('Team members loaded:', response);
      setMembers(response.data || []);
    } catch (error) {
      console.error('Error loading team members:', error);
      showNotification(`Error cargando miembros: ${error.message}`, 'error');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación básica
    if (!formData.name || formData.name.trim() === '') {
      showNotification('El nombre es obligatorio', 'error');
      return;
    }

    try {
      setSaving(true);
      const memberData = {
        ...formData,
        name: formData.name.trim(),
        hourly_rate: parseFloat(formData.hourly_rate) || 0,
        weekly_capacity: parseInt(formData.weekly_capacity) || 40,
        skills: formData.skills ? formData.skills.split(',').map(s => s.trim()).filter(s => s) : []
      };

      console.log('Submitting member data:', memberData);

      let result;
      if (editingMember) {
        console.log('Updating member:', { 
          editingMember, 
          id: editingMember.id, 
          memberData 
        });
        result = await capacityApi.updateTeamMember(editingMember.id, memberData);
        console.log('Update result:', result);
        
        // Actualizar el estado local inmediatamente
        if (result.success && result.data) {
          setMembers(prevMembers => 
            prevMembers.map(member => 
              member.id === editingMember.id ? result.data : member
            )
          );
        }
        
        showNotification(`${memberData.name} ha sido actualizado exitosamente`, 'success');
      } else {
        console.log('Creating new member');
        result = await capacityApi.createTeamMember(memberData);
        console.log('Create result:', result);
        
        // Agregar el nuevo miembro al estado local
        if (result.success && result.data) {
          setMembers(prevMembers => [...prevMembers, result.data]);
        }
        
        showNotification(`${memberData.name} ha sido añadido al equipo`, 'success');
      }

      setShowModal(false);
      setEditingMember(null);
      resetForm();
      
      // Asegurar que la lista se recargue
      console.log('Reloading members after save...');
      await loadMembers();
    } catch (error) {
      console.error('Error saving member:', error);
      const errorMessage = error.message || 'Error desconocido al guardar el miembro';
      showNotification(`Error: ${errorMessage}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (member) => {
    console.log('=== HANDLE EDIT CALLED ===');
    console.log('Opening edit modal for member:', member);
    console.log('Current showModal state:', showModal);
    
    setEditingMember(member);
    setFormData({
      name: member.name || '',
      email: member.email || '',
      role: member.role || 'Developer',
      weekly_capacity: member.weekly_capacity || 40,
      hourly_rate: member.hourly_rate || 0,
      department: member.department || 'Development',
      hire_date: member.hire_date || '',
      skills: member.skills ? member.skills.join(', ') : '',
      notes: member.notes || ''
    });
    
    console.log('Setting showModal to true...');
    setShowModal(true);
    console.log('=== END HANDLE EDIT ===');
  };

  // Función para mostrar notificaciones
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDeleteClick = (member) => {
    setMemberToDelete(member);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      console.log('Deleting member:', memberToDelete);
      const result = await capacityApi.deleteTeamMember(memberToDelete.id);
      console.log('Delete result:', result);
      
      showNotification(`${memberToDelete.name} ha sido eliminado del equipo`, 'success');
      
      // Recargar los miembros para mostrar el estado actualizado
      await loadMembers();
      
    } catch (error) {
      console.error('Error deleting member:', error);
      const errorMessage = error.message || 'Error desconocido al eliminar el miembro';
      showNotification(`Error: ${errorMessage}`, 'error');
    } finally {
      setShowDeleteConfirm(false);
      setMemberToDelete(null);
    }
  };

  // Función para generar email automáticamente
  const generateEmail = (fullName) => {
    if (!fullName || fullName.trim() === '') return '';
    
    const names = fullName.trim().split(' ');
    if (names.length < 2) return '';
    
    const firstName = names[0].toLowerCase();
    const lastName = names[names.length - 1].toLowerCase();
    
    return `${firstName.charAt(0)}${lastName}@aplyca.com`;
  };

  // Contar cuántos emails necesitan actualización
  const getEmailsToUpdate = () => {
    return members.filter(member => {
      const standardEmail = generateEmail(member.name);
      return standardEmail && member.email !== standardEmail;
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'Developer',
      weekly_capacity: 40,
      hourly_rate: 0,
      department: 'Development',
      hire_date: '',
      skills: '',
      notes: ''
    });
  };

  const handleNewMember = () => {
    console.log('=== HANDLE NEW MEMBER CALLED ===');
    console.log('Current showModal state:', showModal);
    setEditingMember(null);
    resetForm();
    console.log('Setting showModal to true...');
    setShowModal(true);
    console.log('=== END HANDLE NEW MEMBER ===');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Gestión de Equipo</h2>
          <p className="text-gray-600">Administra los miembros del equipo y su información</p>
          {/* Debug info */}
          <p className="text-xs text-purple-600 mt-1">
            Modal: {showModal ? 'ABIERTO' : 'CERRADO'} | 
            Editando: {editingMember ? editingMember.name : 'NINGUNO'} | 
            Miembros: {members.length}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={async () => {
              try {
                console.log('Updating all emails to standard format...');
                setSaving(true);
                
                let updatedCount = 0;
                const emailsToUpdate = getEmailsToUpdate();
                console.log(`Found ${emailsToUpdate.length} emails to update`);
                
                for (const member of emailsToUpdate) {
                  const standardEmail = generateEmail(member.name);
                  console.log(`Updating email for ${member.name}: ${member.email} -> ${standardEmail}`);
                  try {
                    // Enviar solo los campos que queremos actualizar
                    await capacityApi.updateTeamMember(member.id, {
                      name: member.name,
                      email: standardEmail,
                      role: member.role,
                      weekly_capacity: member.weekly_capacity,
                      hourly_rate: member.hourly_rate,
                      department: member.department,
                      hire_date: member.hire_date,
                      skills: member.skills,
                      notes: member.notes
                    });
                    updatedCount++;
                  } catch (error) {
                    console.error(`Error updating email for ${member.name}:`, error);
                  }
                }
                
                await loadMembers();
                showNotification(`${updatedCount} emails actualizados al formato estándar`, 'success');
              } catch (error) {
                console.error('Bulk email update failed:', error);
                showNotification(`Error al actualizar emails: ${error.message}`, 'error');
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
            className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
              saving 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}
          >
            <Mail className="w-4 h-4 mr-2" />
            {saving ? 'Actualizando...' : `Fix Emails (${getEmailsToUpdate().length})`}
          </button>
          <button
            onClick={async () => {
              try {
                console.log('Refreshing team members...');
                await loadMembers();
                showNotification('Lista de miembros actualizada', 'success');
              } catch (error) {
                console.error('Refresh failed:', error);
                showNotification(`Error al actualizar: ${error.message}`, 'error');
              }
            }}
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refrescar
          </button>
          <button
            onClick={async () => {
              try {
                console.log('Testing single member update...');
                if (members.length > 0) {
                  const firstMember = members[0];
                  console.log('Testing update with first member:', firstMember);
                  
                  // Test simple: solo cambiar las notas
                  const testUpdate = {
                    name: firstMember.name,
                    email: firstMember.email,
                    role: firstMember.role,
                    weekly_capacity: firstMember.weekly_capacity,
                    hourly_rate: firstMember.hourly_rate,
                    department: firstMember.department,
                    hire_date: firstMember.hire_date,
                    skills: firstMember.skills,
                    notes: `Test update ${new Date().toLocaleTimeString()}`
                  };
                  
                  console.log('Sending test update:', testUpdate);
                  const result = await capacityApi.updateTeamMember(firstMember.id, testUpdate);
                  console.log('Test update result:', result);
                  
                  await loadMembers();
                  showNotification(`Test actualización exitosa: ${firstMember.name}`, 'success');
                } else {
                  showNotification('No hay miembros para probar', 'error');
                }
              } catch (error) {
                console.error('Test update failed:', error);
                showNotification(`Error en test: ${error.message}`, 'error');
              }
            }}
            className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Test Update
          </button>
          <button
            onClick={() => {
              console.log('=== NUEVO MIEMBRO CLICKED ===');
              console.log('Current showModal:', showModal);
              handleNewMember();
              console.log('After handleNewMember called');
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Miembro
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Miembro
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rol y Departamento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Capacidad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contacto
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {member.name}
                      </div>
                      {member.skills && member.skills.length > 0 && (
                        <div className="text-xs text-gray-500">
                          {member.skills.slice(0, 2).join(', ')}
                          {member.skills.length > 2 && '...'}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{member.role}</div>
                  <div className="text-xs text-gray-500 flex items-center">
                    <Building className="h-3 w-3 mr-1" />
                    {member.department}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <Clock className="h-4 w-4 mr-1" />
                    {member.weekly_capacity}h/semana
                  </div>
                  {member.hourly_rate > 0 && (
                    <div className="text-xs text-gray-500">
                      ${member.hourly_rate}/hora
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 flex items-center">
                    <Mail className="h-4 w-4 mr-1" />
                    {member.email || 'No especificado'}
                  </div>
                  {member.hire_date && (
                    <div className="text-xs text-gray-500">
                      Desde: {new Date(member.hire_date).toLocaleDateString()}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      console.log('Edit button clicked for member:', member);
                      handleEdit(member);
                    }}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                    title="Editar miembro"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      console.log('Delete button clicked for member:', member);
                      handleDeleteClick(member);
                    }}
                    className="text-red-600 hover:text-red-900"
                    title="Eliminar miembro"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {members.length === 0 && (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay miembros</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comienza agregando el primer miembro del equipo.
            </p>
            <button
              onClick={handleNewMember}
              className="mt-4 flex items-center mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Miembro
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingMember ? 'Editar Miembro' : 'Nuevo Miembro'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  console.log('Closing modal with X button');
                  setShowModal(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setFormData({
                      ...formData, 
                      name: newName,
                      // Auto-generar email si no tiene un email personalizado
                      email: formData.email === '' || formData.email.includes('@aplyca.com') 
                        ? generateEmail(newName) 
                        : formData.email
                    });
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="flex space-x-2">
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const generatedEmail = generateEmail(formData.name);
                      if (generatedEmail) {
                        setFormData({...formData, email: generatedEmail});
                      }
                    }}
                    className="px-3 py-2 bg-blue-100 text-blue-700 border border-blue-300 rounded-md hover:bg-blue-200 transition-colors text-sm"
                    title="Generar email automático"
                  >
                    Auto
                  </button>
                </div>
                {formData.name && (
                  <p className="text-xs text-gray-500 mt-1">
                    Sugerido: {generateEmail(formData.name)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rol
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {roles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departamento
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Horas/semana
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="80"
                    value={formData.weekly_capacity}
                    onChange={(e) => setFormData({...formData, weekly_capacity: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tarifa/hora
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de contratación
                </label>
                <input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Habilidades (separadas por comas)
                </label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({...formData, skills: e.target.value})}
                  placeholder="React, Node.js, PostgreSQL..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows="3"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                    saving 
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {saving 
                    ? (editingMember ? 'Actualizando...' : 'Creando...') 
                    : (editingMember ? 'Actualizar' : 'Crear')
                  }
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar */}
      {showDeleteConfirm && memberToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Confirmar eliminación
                  </h3>
                  <p className="text-sm text-gray-600">
                    Esta acción no se puede deshacer
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700">
                  ¿Estás seguro de que quieres eliminar a{' '}
                  <span className="font-semibold text-gray-900">
                    {memberToDelete.name}
                  </span>{' '}
                  del equipo?
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  El miembro será marcado como inactivo y no aparecerá en las asignaciones futuras.
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors font-medium"
                >
                  Sí, eliminar
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setMemberToDelete(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notificación toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 transition-all duration-300 ease-in-out transform translate-x-0">
          <div className={`flex items-center space-x-3 p-4 rounded-lg shadow-lg max-w-md ${
            notification.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className={`flex-shrink-0 ${
              notification.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}>
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <p className={`text-sm font-medium ${
              notification.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {notification.message}
            </p>
            <button
              onClick={() => setNotification(null)}
              className={`flex-shrink-0 ${
                notification.type === 'success' ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMembersManagement;