import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Copy, 
  Filter,
  Download,
  Upload,
  AlertTriangle,
  Check,
  X,
  User,
  Clock,
  Briefcase
} from 'lucide-react';
import { useWeeklyAssignments, useMemberAvailability } from '../hooks/useCapacityCalculations';
import { capacityApi, projectsApi } from '../services/supabaseApi';

const AssignmentTable = ({ weekStartDate, onWeekChange }) => {
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [showNewAssignmentForm, setShowNewAssignmentForm] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState(null);
  const [filters, setFilters] = useState({
    project: '',
    member: '',
    type: '',
    priority: ''
  });

  const {
    assignments,
    loading,
    error,
    refresh,
    createAssignment,
    updateAssignment,
    deleteAssignment
  } = useWeeklyAssignments(weekStartDate);

  const { checkAvailability } = useMemberAvailability();

  // Función para mostrar notificaciones
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Función para manejar eliminación
  const handleDeleteClick = (assignment) => {
    setAssignmentToDelete(assignment);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (assignmentToDelete) {
      const result = await deleteAssignment(assignmentToDelete.id);
      if (result.success) {
        showNotification('Asignación eliminada exitosamente', 'success');
      } else {
        showNotification('Error eliminando asignación: ' + result.error, 'error');
      }
      setShowDeleteConfirm(false);
      setAssignmentToDelete(null);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [projectsResponse, membersResponse] = await Promise.all([
          projectsApi.getAll(),
          capacityApi.getAllTeamMembers()
        ]);

        if (projectsResponse.success) {
          setProjects(projectsResponse.data);
        }
        if (membersResponse.success) {
          setTeamMembers(membersResponse.data);
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
      }
    };

    loadInitialData();
  }, []);

  // Filtrar asignaciones
  const filteredAssignments = useMemo(() => {
    return assignments.filter(assignment => {
      if (filters.project && assignment.project_id !== filters.project) return false;
      if (filters.member && assignment.member_id !== filters.member) return false;
      if (filters.type && assignment.assignment_type !== filters.type) return false;
      if (filters.priority && assignment.priority !== filters.priority) return false;
      return true;
    });
  }, [assignments, filters]);

  // Componente para nueva asignación
  const NewAssignmentForm = () => {
    const [formData, setFormData] = useState({
      project_id: '',
      member_id: '',
      assigned_hours: '',
      assignment_type: 'Compromiso',
      priority: 'Media',
      is_billable: true,
      leader_id: '',
      notes: ''
    });
    const [availability, setAvailability] = useState(null);
    const [checking, setChecking] = useState(false);

    // Verificar disponibilidad cuando cambia el miembro
    useEffect(() => {
      const checkMemberAvailability = async () => {
        if (!formData.member_id) {
          setAvailability(null);
          return;
        }

        setChecking(true);
        try {
          const availData = await checkAvailability(formData.member_id, weekStartDate);
          setAvailability(availData);
        } catch (err) {
          console.error('Error checking availability:', err);
        } finally {
          setChecking(false);
        }
      };

      checkMemberAvailability();
    }, [formData.member_id]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      const result = await createAssignment(formData);
      if (result.success) {
        setShowNewAssignmentForm(false);
        setFormData({
          project_id: '',
          member_id: '',
          assigned_hours: '',
          assignment_type: 'Compromiso',
          priority: 'Media',
          is_billable: true,
          leader_id: '',
          notes: ''
        });
        showNotification('Asignación creada exitosamente', 'success');
      } else {
        showNotification('Error creando asignación: ' + result.error, 'error');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Nueva Asignación</h3>
            <button
              onClick={() => setShowNewAssignmentForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proyecto *
                </label>
                <select
                  value={formData.project_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, project_id: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Seleccionar proyecto</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name} - {project.client?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Miembro del Equipo *
                </label>
                <select
                  value={formData.member_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, member_id: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Seleccionar miembro</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name} - {member.department}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mostrar disponibilidad */}
            {availability && (
              <div className={`p-3 rounded-lg border ${
                availability.utilization_percentage > 100 
                  ? 'bg-red-50 border-red-200' 
                  : availability.utilization_percentage >= 80
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center justify-between text-sm">
                  <span>Capacidad: {availability.weekly_capacity}h</span>
                  <span>Asignadas: {availability.total_assigned}h</span>
                  <span>Disponibles: {availability.available_hours}h</span>
                  <span className="font-medium">
                    Utilización: {availability.utilization_percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Horas Asignadas *
                </label>
                <input
                  type="number"
                  min="0"
                  max="40"
                  step="0.5"
                  value={formData.assigned_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, assigned_hours: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Asignación
                </label>
                <select
                  value={formData.assignment_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, assignment_type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="Compromiso">Compromiso</option>
                  <option value="Reserva">Reserva</option>
                  <option value="Disponible">Disponible</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridad
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Líder Responsable
                </label>
                <select
                  value={formData.leader_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, leader_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Sin líder asignado</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_billable}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_billable: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Facturable</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas/Observaciones
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Notas adicionales sobre la asignación..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowNewAssignmentForm(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={checking}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
              >
                {checking ? 'Verificando...' : 'Crear Asignación'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Componente para editar asignación
  const EditAssignmentForm = () => {
    const [formData, setFormData] = useState({
      project_id: editingAssignment?.project_id || '',
      member_id: editingAssignment?.member_id || '',
      assigned_hours: editingAssignment?.assigned_hours || '',
      assignment_type: editingAssignment?.assignment_type || 'Compromiso',
      priority: editingAssignment?.priority || 'Media',
      is_billable: editingAssignment?.is_billable || true,
      leader_id: editingAssignment?.leader_id || '',
      notes: editingAssignment?.notes || ''
    });
    const [availability, setAvailability] = useState(null);
    const [checking, setChecking] = useState(false);

    // Verificar disponibilidad cuando cambia el miembro
    useEffect(() => {
      const checkMemberAvailability = async () => {
        if (!formData.member_id) {
          setAvailability(null);
          return;
        }

        setChecking(true);
        try {
          const availData = await checkAvailability(formData.member_id, weekStartDate);
          setAvailability(availData);
        } catch (err) {
          console.error('Error checking availability:', err);
        } finally {
          setChecking(false);
        }
      };

      checkMemberAvailability();
    }, [formData.member_id]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      console.log('Enviando actualización:', { id: editingAssignment.id, formData });
      
      const result = await updateAssignment(editingAssignment.id, formData);
      console.log('Resultado de actualización:', result);
      
      if (result.success) {
        setEditingAssignment(null);
        showNotification('Asignación actualizada exitosamente', 'success');
      } else {
        showNotification('Error actualizando asignación: ' + result.error, 'error');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Editar Asignación</h3>
            <button
              onClick={() => setEditingAssignment(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proyecto *
                </label>
                <select
                  value={formData.project_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, project_id: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Seleccionar proyecto</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name} - {project.client?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Miembro del Equipo *
                </label>
                <select
                  value={formData.member_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, member_id: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Seleccionar miembro</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name} - {member.department}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mostrar disponibilidad */}
            {availability && (
              <div className={`p-3 rounded-lg border ${
                availability.utilization_percentage > 100 
                  ? 'bg-red-50 border-red-200' 
                  : availability.utilization_percentage >= 80
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center justify-between text-sm">
                  <span>Capacidad: {availability.weekly_capacity}h</span>
                  <span>Asignadas: {availability.total_assigned}h</span>
                  <span>Disponibles: {availability.available_hours}h</span>
                  <span className="font-medium">
                    Utilización: {availability.utilization_percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Horas Asignadas *
                </label>
                <input
                  type="number"
                  min="0"
                  max="40"
                  step="0.5"
                  value={formData.assigned_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, assigned_hours: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Asignación
                </label>
                <select
                  value={formData.assignment_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, assignment_type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="Compromiso">Compromiso</option>
                  <option value="Reserva">Reserva</option>
                  <option value="Disponible">Disponible</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridad
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Líder Responsable
                </label>
                <select
                  value={formData.leader_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, leader_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Sin líder asignado</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_billable}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_billable: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Facturable</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas/Observaciones
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Notas adicionales sobre la asignación..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setEditingAssignment(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={checking}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
              >
                {checking ? 'Verificando...' : 'Actualizar Asignación'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Función para obtener color de prioridad
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Alta': return 'bg-red-100 text-red-800';
      case 'Media': return 'bg-yellow-100 text-yellow-800';
      case 'Baja': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Función para obtener color de tipo de asignación
  const getTypeColor = (type) => {
    switch (type) {
      case 'Compromiso': return 'bg-blue-100 text-blue-800';
      case 'Reserva': return 'bg-purple-100 text-purple-800';
      case 'Disponible': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Cargando asignaciones...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">Error: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header minimalista */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light text-gray-900 mb-1">
            Asignaciones
          </h1>
          <p className="text-sm text-gray-500">
            {filteredAssignments.length} asignación(es) esta semana
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowNewAssignmentForm(true)}
            className="flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva
          </button>
        </div>
      </div>

      {/* Filtros elegantes */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <select
              value={filters.project}
              onChange={(e) => setFilters(prev => ({ ...prev, project: e.target.value }))}
              className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-transparent min-w-[180px]"
            >
              <option value="">Todos los proyectos</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="relative">
            <select
              value={filters.member}
              onChange={(e) => setFilters(prev => ({ ...prev, member: e.target.value }))}
              className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-transparent min-w-[160px]"
            >
              <option value="">Todos los miembros</option>
              {teamMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={refresh}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Actualizar datos"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Tabla elegante y minimalista */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 tracking-wide">
                  Miembro
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 tracking-wide">
                  Proyecto
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 tracking-wide">
                  Horas
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 tracking-wide">
                  Tipo
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 tracking-wide">
                  Prioridad
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 tracking-wide">
                  Líder
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 tracking-wide">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredAssignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50/50 transition-colors">
                  {/* Miembro */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-700">
                          {assignment.member?.name?.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {assignment.member?.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {assignment.member?.department}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Proyecto */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {assignment.project?.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {assignment.project?.client?.name}
                      </div>
                    </div>
                  </td>

                  {/* Horas */}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-semibold text-gray-900">
                        {assignment.assigned_hours}h
                      </span>
                      {assignment.is_billable && (
                        <span className="text-xs text-green-600 font-medium">Facturable</span>
                      )}
                    </div>
                  </td>

                  {/* Tipo */}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm text-gray-700">
                      {assignment.assignment_type}
                    </span>
                  </td>

                  {/* Prioridad */}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-3 py-1 text-xs font-medium rounded ${
                      assignment.priority === 'Alta' ? 'bg-red-50 text-red-600 border border-red-200' :
                      assignment.priority === 'Media' ? 'bg-yellow-50 text-yellow-600 border border-yellow-200' :
                      'bg-green-50 text-green-600 border border-green-200'
                    }`}>
                      {assignment.priority}
                    </span>
                  </td>

                  {/* Líder */}
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-700">
                    {assignment.leader?.name || '-'}
                  </td>

                  {/* Acciones */}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        onClick={() => {
                          console.log('Editando asignación:', assignment);
                          setEditingAssignment(assignment);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Editar asignación"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(assignment)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar asignación"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Estado vacío elegante */}
      {filteredAssignments.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Sin asignaciones
          </h3>
          <p className="text-gray-500 mb-6">
            No hay asignaciones para esta semana. Crea una nueva para comenzar.
          </p>
          <button
            onClick={() => setShowNewAssignmentForm(true)}
            className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear Primera Asignación
          </button>
        </div>
      )}

      {/* Modal de nueva asignación */}
      {showNewAssignmentForm && <NewAssignmentForm />}
      
      {/* Modal de editar asignación */}
      {editingAssignment && (
        <>
          {console.log('Renderizando EditAssignmentForm con:', editingAssignment)}
          <EditAssignmentForm />
        </>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Confirmar Eliminación</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar la asignación de{' '}
              <strong>{assignmentToDelete?.member?.name}</strong> del proyecto{' '}
              <strong>{assignmentToDelete?.project?.name}</strong>?
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setAssignmentToDelete(null);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificación */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border ${
          notification.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <Check className="w-5 h-5 mr-2" />
            ) : (
              <AlertTriangle className="w-5 h-5 mr-2" />
            )}
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentTable;