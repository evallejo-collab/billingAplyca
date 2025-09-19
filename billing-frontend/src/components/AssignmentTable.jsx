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
      } else {
        alert('Error creando asignación: ' + result.error);
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
      {/* Header con filtros y acciones */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Asignaciones de Capacidad
          </h2>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filters.project}
              onChange={(e) => setFilters(prev => ({ ...prev, project: e.target.value }))}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="">Todos los proyectos</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <select
              value={filters.member}
              onChange={(e) => setFilters(prev => ({ ...prev, member: e.target.value }))}
              className="text-sm border border-gray-300 rounded px-2 py-1"
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

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowNewAssignmentForm(true)}
            className="flex items-center px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Asignación
          </button>
          <button
            onClick={refresh}
            className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Tabla de asignaciones */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Miembro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proyecto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Horas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prioridad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Líder
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {assignment.member?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {assignment.member?.department}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Briefcase className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {assignment.project?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {assignment.project?.client?.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        {assignment.assigned_hours}h
                      </span>
                      {assignment.is_billable && (
                        <span className="ml-2 text-xs text-green-600">Facturable</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(assignment.assignment_type)}`}>
                      {assignment.assignment_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(assignment.priority)}`}>
                      {assignment.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {assignment.leader?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingAssignment(assignment)}
                        className="text-violet-600 hover:text-violet-900"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('¿Estás seguro de eliminar esta asignación?')) {
                            await deleteAssignment(assignment.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
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

        {filteredAssignments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay asignaciones para esta semana
          </div>
        )}
      </div>

      {/* Modal de nueva asignación */}
      {showNewAssignmentForm && <NewAssignmentForm />}
    </div>
  );
};

export default AssignmentTable;