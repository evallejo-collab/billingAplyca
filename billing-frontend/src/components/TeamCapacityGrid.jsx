import { useState, useMemo } from 'react';
import { 
  User, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Settings
} from 'lucide-react';
import { useCapacityCalculations } from '../hooks/useCapacityCalculations';

const TeamCapacityGrid = ({ weekStartDate, assignments = [] }) => {
  const [expandedMembers, setExpandedMembers] = useState(new Set());
  const [sortBy, setSortBy] = useState('utilization'); // 'name', 'utilization', 'department'
  const [showOnlyOverallocated, setShowOnlyOverallocated] = useState(false);

  const { 
    teamUtilization, 
    loading, 
    error, 
    getUtilizationColor, 
    getUtilizationStatus 
  } = useCapacityCalculations(weekStartDate);

  // Función para obtener asignaciones por miembro
  const getAssignmentsByMember = (memberId) => {
    return assignments.filter(assignment => assignment.member_id === memberId);
  };

  // Función para alternar expansión de miembro
  const toggleMemberExpansion = (memberId) => {
    const newExpanded = new Set(expandedMembers);
    if (newExpanded.has(memberId)) {
      newExpanded.delete(memberId);
    } else {
      newExpanded.add(memberId);
    }
    setExpandedMembers(newExpanded);
  };

  // Ordenar y filtrar miembros del equipo
  const sortedAndFilteredMembers = useMemo(() => {
    let filtered = teamUtilization;

    // Filtrar solo sobrecargados si está activado
    if (showOnlyOverallocated) {
      filtered = filtered.filter(member => member.utilization_percentage > 100);
    }

    // Ordenar según criterio seleccionado
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.member_name.localeCompare(b.member_name);
        case 'utilization':
          return b.utilization_percentage - a.utilization_percentage;
        case 'department':
          return (a.department || '').localeCompare(b.department || '');
        default:
          return 0;
      }
    });
  }, [teamUtilization, sortBy, showOnlyOverallocated]);

  // Componente para barra de progreso de utilización
  const UtilizationBar = ({ percentage, capacity, assigned, available }) => {
    const color = getUtilizationColor(percentage);
    const width = Math.min(percentage, 100);
    const overflowWidth = percentage > 100 ? percentage - 100 : 0;

    const getBarColor = () => {
      switch (color) {
        case 'red': return 'bg-red-500';
        case 'green': return 'bg-green-500';
        case 'blue': return 'bg-blue-500';
        default: return 'bg-gray-400';
      }
    };

    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-600">
          <span>{assigned}h de {capacity}h</span>
          <span className={`font-medium ${
            percentage > 100 ? 'text-red-600' : 
            percentage >= 80 ? 'text-green-600' : 
            'text-gray-600'
          }`}>
            {percentage.toFixed(1)}%
          </span>
        </div>
        <div className="relative w-full bg-gray-200 rounded-full h-3">
          {/* Barra principal */}
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${getBarColor()}`}
            style={{ width: `${width}%` }}
          />
          {/* Barra de overflow (roja) */}
          {overflowWidth > 0 && (
            <div 
              className="absolute top-0 h-3 bg-red-600 rounded-r-full"
              style={{ 
                left: '100%', 
                width: `${Math.min(overflowWidth, 50)}px`
              }}
            />
          )}
          {/* Línea de 100% */}
          <div className="absolute top-0 w-px h-3 bg-gray-400 opacity-50" style={{ left: '100%' }} />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">
            {available > 0 ? `${available}h disponibles` : 'Sin disponibilidad'}
          </span>
          <span className={`font-medium ${
            percentage > 100 ? 'text-red-600' : 
            percentage >= 80 ? 'text-green-600' : 
            percentage >= 60 ? 'text-blue-600' :
            'text-gray-600'
          }`}>
            {getUtilizationStatus(percentage)}
          </span>
        </div>
      </div>
    );
  };

  // Componente para detalles de asignaciones de un miembro
  const MemberAssignmentDetails = ({ member }) => {
    const memberAssignments = getAssignmentsByMember(member.member_id);

    if (memberAssignments.length === 0) {
      return (
        <div className="text-sm text-gray-500 italic pl-8">
          Sin asignaciones para esta semana
        </div>
      );
    }

    return (
      <div className="pl-8 space-y-2">
        {memberAssignments.map((assignment) => (
          <div 
            key={assignment.id} 
            className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <Briefcase className="w-4 h-4 text-gray-400" />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {assignment.project?.name}
                </div>
                <div className="text-xs text-gray-500">
                  {assignment.project?.client?.name}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {assignment.assigned_hours}h
                </div>
                <div className="text-xs text-gray-500">
                  {assignment.assignment_type}
                </div>
              </div>
              <div className={`px-2 py-1 text-xs font-medium rounded-full ${
                assignment.priority === 'Alta' ? 'bg-red-100 text-red-800' :
                assignment.priority === 'Media' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {assignment.priority}
              </div>
              {assignment.is_billable && (
                <div className="text-xs text-green-600 font-medium">
                  Facturable
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Cargando utilización del equipo...</div>
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
      {/* Header con controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Capacidad del Equipo
          </h2>
          <div className="flex items-center space-x-2">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={showOnlyOverallocated}
                onChange={(e) => setShowOnlyOverallocated(e.target.checked)}
                className="mr-2"
              />
              Solo sobrecargados
            </label>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm border border-gray-300 rounded px-3 py-1"
          >
            <option value="utilization">Ordenar por utilización</option>
            <option value="name">Ordenar por nombre</option>
            <option value="department">Ordenar por departamento</option>
          </select>
        </div>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <User className="w-5 h-5 text-gray-400 mr-2" />
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {teamUtilization.length}
              </div>
              <div className="text-sm text-gray-500">Miembros Activos</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <TrendingUp className="w-5 h-5 text-red-400 mr-2" />
            <div>
              <div className="text-2xl font-bold text-red-600">
                {teamUtilization.filter(m => m.utilization_percentage > 100).length}
              </div>
              <div className="text-sm text-gray-500">Sobrecargados</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <TrendingDown className="w-5 h-5 text-blue-400 mr-2" />
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {teamUtilization.filter(m => m.utilization_percentage < 60).length}
              </div>
              <div className="text-sm text-gray-500">Subutilizados</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-green-400 mr-2" />
            <div>
              <div className="text-2xl font-bold text-green-600">
                {teamUtilization.reduce((sum, m) => sum + (m.available_hours || 0), 0)}h
              </div>
              <div className="text-sm text-gray-500">Horas Disponibles</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de miembros del equipo */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="space-y-1">
          {sortedAndFilteredMembers.map((member) => {
            const isExpanded = expandedMembers.has(member.member_id);
            const memberAssignments = getAssignmentsByMember(member.member_id);
            
            return (
              <div key={member.member_id} className="border-b border-gray-100 last:border-b-0">
                {/* Fila principal del miembro */}
                <div 
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleMemberExpansion(member.member_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex items-center">
                        {memberAssignments.length > 0 ? (
                          isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                        <User className="w-5 h-5 text-gray-400 ml-2 mr-3" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {member.member_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {member.department} • {memberAssignments.length} proyecto(s)
                            </div>
                          </div>
                          
                          <div className="flex-1 max-w-md mx-8">
                            <UtilizationBar
                              percentage={member.utilization_percentage || 0}
                              capacity={member.weekly_capacity || 0}
                              assigned={member.total_assigned || 0}
                              available={member.available_hours || 0}
                            />
                          </div>
                          
                          <div className="text-right">
                            <div className={`text-sm font-medium ${
                              member.utilization_percentage > 100 ? 'text-red-600' : 
                              member.utilization_percentage >= 80 ? 'text-green-600' : 
                              'text-gray-900'
                            }`}>
                              {member.total_assigned || 0}h / {member.weekly_capacity || 0}h
                            </div>
                            <div className="text-xs text-gray-500">
                              {(member.utilization_percentage || 0).toFixed(1)}% utilización
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detalles expandidos */}
                {isExpanded && (
                  <div className="px-4 pb-4 bg-gray-50">
                    <MemberAssignmentDetails member={member} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {sortedAndFilteredMembers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {showOnlyOverallocated 
              ? 'No hay miembros sobrecargados esta semana'
              : 'No hay datos de utilización disponibles'
            }
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-sm font-medium text-gray-900 mb-2">Leyenda de Estados:</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
            <span>Sobrecargado (&gt;100%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
            <span>Óptimo (80-100%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
            <span>Bueno (60-79%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-400 rounded mr-2"></div>
            <span>Subutilizado (&lt;60%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamCapacityGrid;