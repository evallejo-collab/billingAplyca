import { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  User, 
  Clock, 
  Briefcase, 
  Plus, 
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Calendar,
  Building,
  ToggleLeft,
  ToggleRight,
  Target,
  Zap,
  Users,
  TrendingUp,
  Copy,
  Code,
  Server,
  UserCheck,
  CheckCircle,
  X
} from 'lucide-react';
import { capacityApi, projectsApi, clientsApi } from '../services/supabaseApi';
import { useWeekUtils, useBulkOperations } from '../hooks/useCapacityCalculations';

// Componente para miembro draggable con diseño profesional
const DraggableMember = ({ member, totalAssigned = 0, isOverlay = false, departmentColor }) => {
  const utilizationPercentage = (totalAssigned / member.weekly_capacity) * 100;
  
  const getUtilizationTheme = (percentage) => {
    if (percentage > 100) return {
      bg: 'bg-white',
      border: 'border-red-300',
      text: 'text-gray-900',
      progress: 'bg-red-500',
      badge: 'bg-gradient-to-br from-red-500 to-red-600 shadow-lg'
    };
    if (percentage >= 80) return {
      bg: 'bg-white',
      border: 'border-green-300',
      text: 'text-gray-900',
      progress: 'bg-green-500',
      badge: 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg'
    };
    if (percentage >= 60) return {
      bg: 'bg-white',
      border: 'border-blue-300',
      text: 'text-gray-900',
      progress: 'bg-blue-500',
      badge: 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg'
    };
    return {
      bg: 'bg-white',
      border: 'border-gray-300',
      text: 'text-gray-900',
      progress: 'bg-gray-400',
      badge: 'bg-gradient-to-br from-slate-500 to-slate-600 shadow-lg'
    };
  };

  const theme = getUtilizationTheme(utilizationPercentage);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: member.id,
    data: {
      type: 'member',
      member
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative p-3 border cursor-grab active:cursor-grabbing ${theme.bg} ${theme.border} ${
        isOverlay 
          ? 'shadow-lg scale-105' 
          : 'hover:shadow-md'
      } ${utilizationPercentage > 100 ? 'animate-pulse' : ''} transition-all duration-200 group rounded-lg`}
    >
      {/* Progress bar superior con colores vibrantes */}
      <div className={`absolute top-0 left-0 right-0 h-2 ${theme.progress} shadow-sm`} style={{ width: `${Math.min(utilizationPercentage, 100)}%` }} />
      
      {/* Compact header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${theme.text} truncate`}>
            {member.name}
          </div>
          <div className="text-xs text-gray-500">
            {member.role}
          </div>
        </div>
        
        <div className={`w-8 h-8 rounded-full ${theme.badge} flex items-center justify-center border-2 border-white`}>
          <span className="text-xs font-bold text-white drop-shadow-sm">
            {utilizationPercentage.toFixed(0)}%
          </span>
        </div>
      </div>
      
      {/* Progress bar horizontal vibrante */}
      <div className="w-full bg-slate-300 rounded-full h-2 mb-2 shadow-inner">
        <div
          className={`h-2 rounded-full ${theme.progress} transition-all duration-300 shadow-md`}
          style={{ 
            width: `${Math.min(utilizationPercentage, 100)}%`,
            background: utilizationPercentage > 100 ? 'linear-gradient(90deg, #ef4444, #dc2626)' :
                       utilizationPercentage >= 80 ? 'linear-gradient(90deg, #10b981, #059669)' :
                       utilizationPercentage >= 60 ? 'linear-gradient(90deg, #3b82f6, #2563eb)' :
                       'linear-gradient(90deg, #6b7280, #4b5563)'
          }}
        />
      </div>
      
      {/* Compact info con colores */}
      <div className={`text-xs font-medium ${
        utilizationPercentage > 100 ? 'text-red-700' :
        utilizationPercentage >= 80 ? 'text-emerald-700' :
        utilizationPercentage >= 60 ? 'text-blue-700' :
        'text-slate-600'
      }`}>
        <span className="font-bold">{totalAssigned.toFixed(1)}h</span> / {member.weekly_capacity}h
      </div>
    </div>
  );
};

// Componente para asignación draggable dentro de proyectos
const DraggableAssignment = ({ assignment, member, project, isExpanded, onUpdateHours }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingHours, setEditingHours] = useState(assignment.assigned_hours);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: `assignment-${assignment.id}`,
    data: {
      type: 'assignment',
      assignment,
      member,
      project
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleHoursClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditingHours(assignment.assigned_hours);
  };

  const handleHoursSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newHours = parseFloat(editingHours);
    if (isNaN(newHours) || newHours <= 0) {
      setEditingHours(assignment.assigned_hours);
      setIsEditing(false);
      return;
    }
    
    await onUpdateHours(assignment.id, newHours);
    setIsEditing(false);
  };

  const handleHoursCancel = (e) => {
    e.stopPropagation();
    setEditingHours(assignment.assigned_hours);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleHoursSubmit(e);
    } else if (e.key === 'Escape') {
      handleHoursCancel(e);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isEditing ? {} : listeners)}
      className="flex items-center justify-between text-xs bg-white p-1.5 rounded-md border border-gray-200 hover:shadow-sm hover:border-gray-300 transition-all"
    >
      <span className="text-gray-900 truncate">{member.name}</span>
      <div className="flex items-center space-x-1">
        {isEditing ? (
          <form onSubmit={handleHoursSubmit} className="flex items-center space-x-1">
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={editingHours}
              onChange={(e) => setEditingHours(e.target.value)}
              onBlur={handleHoursSubmit}
              onKeyDown={handleKeyDown}
              className="w-16 h-6 text-xs text-center border border-blue-300 rounded focus:outline-none focus:border-blue-500 bg-white"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-gray-500 text-xs">h</span>
          </form>
        ) : (
          <button
            onClick={handleHoursClick}
            className="text-gray-600 font-medium hover:text-blue-600 hover:bg-blue-50 px-1 py-0.5 rounded transition-colors"
            title="Clic para editar horas"
          >
            {assignment.assigned_hours}h
          </button>
        )}
        <div className={`w-2 h-2 rounded-full shadow-sm ${
          assignment.priority === 'Alta' ? 'bg-red-500' :
          assignment.priority === 'Media' ? 'bg-yellow-500' :
          'bg-green-500'
        }`} />
      </div>
    </div>
  );
};

// Componente para proyecto (zona de drop) con diseño profesional
const ProjectDropZone = ({ project, members, assignments, onDropMember, onUpdateHours }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const projectAssignments = assignments.filter(a => a.project_id === project.id);
  const totalHours = projectAssignments.reduce((sum, a) => sum + (a.assigned_hours || 0), 0);
  
  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id: `project-${project.id}`,
    data: {
      type: 'project',
      project
    }
  });

  return (
    <div
      ref={setNodeRef}
      className={`border transition-all duration-200 rounded-lg ${
        isOver 
          ? 'border-gray-400 bg-gray-50 shadow-md' 
          : 'border-gray-200 hover:border-gray-400 bg-white hover:bg-gray-50'
      }`}
    >
      {/* Header elegante */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center border border-gray-200">
              <Briefcase className="w-2.5 h-2.5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 text-sm truncate">
                {project.name}
              </h3>
              <p className="text-gray-500 text-xs mt-0.5 truncate">
                {project.client?.name || 'Sin cliente'}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-xs font-medium text-gray-700">
              {projectAssignments.reduce((sum, a) => sum + (a.assigned_hours || 0), 0).toFixed(1)}h
            </div>
            <div className="text-xs text-gray-500">
              {projectAssignments.length}
            </div>
          </div>
          
          <div className={`w-3 h-3 rounded-full transition-all ${isOver ? 'bg-purple-500 shadow-sm' : 'bg-gray-400'}`} />
        </div>
      </div>
      
      {/* Contenido de asignaciones */}
      <div className="p-3 min-h-[120px]">
        {projectAssignments.length === 0 ? (
          <div className="text-center py-6">
            <div className={`text-xs ${
              isOver ? 'text-gray-600' : 'text-gray-400'
            }`}>
              {isOver ? 'Suelta para asignar' : 'Arrastra miembros aquí'}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {(isExpanded ? projectAssignments : projectAssignments.slice(0, 2)).map(assignment => {
              const member = members.find(m => m.id === assignment.member_id);
              if (!member) return null;
              
              return (
                <DraggableAssignment
                  key={assignment.id}
                  assignment={assignment}
                  member={member}
                  project={project}
                  isExpanded={isExpanded}
                  onUpdateHours={onUpdateHours}
                />
              );
            })}
            
            {projectAssignments.length > 2 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full text-xs text-gray-500 hover:text-gray-700 text-center py-1 hover:bg-gray-50 rounded transition-colors"
              >
                {isExpanded ? (
                  <div className="flex items-center justify-center space-x-1">
                    <span>Ver menos</span>
                    <ChevronUp className="w-3 h-3" />
                  </div>
                ) : (
                  <span>+{projectAssignments.length - 2} más</span>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Componente para asignación editable en vista de cliente
const EditableAssignmentInClient = ({ assignment, member, project, onUpdateHours }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingHours, setEditingHours] = useState(assignment.assigned_hours);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: `client-assignment-${assignment.id}`,
    data: {
      type: 'assignment',
      assignment,
      member,
      project
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleHoursClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditingHours(assignment.assigned_hours);
  };

  const handleHoursSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newHours = parseFloat(editingHours);
    if (isNaN(newHours) || newHours <= 0) {
      setEditingHours(assignment.assigned_hours);
      setIsEditing(false);
      return;
    }
    
    await onUpdateHours(assignment.id, newHours);
    setIsEditing(false);
  };

  const handleHoursCancel = (e) => {
    e.stopPropagation();
    setEditingHours(assignment.assigned_hours);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleHoursSubmit(e);
    } else if (e.key === 'Escape') {
      handleHoursCancel(e);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isEditing ? {} : listeners)}
      className="flex items-center justify-between text-xs bg-white p-1.5 rounded-md border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-sm hover:border-gray-300 transition-all"
    >
      <span className="text-gray-900 truncate">{member.name}</span>
      <div className="flex items-center space-x-1">
        {isEditing ? (
          <form onSubmit={handleHoursSubmit} className="flex items-center space-x-1">
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={editingHours}
              onChange={(e) => setEditingHours(e.target.value)}
              onBlur={handleHoursSubmit}
              onKeyDown={handleKeyDown}
              className="w-16 h-6 text-xs text-center border border-blue-300 rounded focus:outline-none focus:border-blue-500 bg-white"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-gray-500 text-xs">h</span>
          </form>
        ) : (
          <button
            onClick={handleHoursClick}
            className="text-gray-600 font-medium hover:text-blue-600 hover:bg-blue-50 px-1 py-0.5 rounded transition-colors"
            title="Clic para editar horas"
          >
            {assignment.assigned_hours}h
          </button>
        )}
        <div className={`w-2 h-2 rounded-full shadow-sm ${
          assignment.priority === 'Alta' ? 'bg-red-500' :
          assignment.priority === 'Media' ? 'bg-yellow-500' :
          'bg-green-500'
        }`} />
      </div>
    </div>
  );
};

// Componente para cliente (zona de drop) con diseño profesional
const ClientDropZone = ({ client, projects, members, assignments, onSelectProject, onUpdateHours }) => {
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const clientProjects = projects.filter(p => p.client_id === client.id);
  const clientAssignments = assignments.filter(a => 
    clientProjects.some(p => p.id === a.project_id)
  );
  const totalHours = clientAssignments.reduce((sum, a) => sum + (a.assigned_hours || 0), 0);
  
  const toggleProjectExpansion = (projectId) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };
  
  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id: `client-${client.id}`,
    data: {
      type: 'client',
      client
    }
  });

  return (
    <div
      ref={setNodeRef}
      className={`border transition-all duration-200 rounded-lg ${
        isOver 
          ? 'border-gray-400 bg-gray-50 shadow-md' 
          : 'border-gray-200 hover:border-gray-400 bg-white hover:bg-gray-50'
      }`}
    >
      {/* Header elegante */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 text-sm truncate">
              {client.name}
            </h3>
            <p className="text-gray-500 text-xs mt-0.5 truncate">
              {clientProjects.length} proyecto{clientProjects.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div className={`w-3 h-3 rounded-full transition-all ${isOver ? 'bg-purple-500 shadow-sm' : 'bg-gray-400'}`} />
        </div>
      </div>
      
      {/* Contenido de proyectos */}
      <div className="p-3 min-h-[120px]">
        {clientProjects.length === 0 ? (
          <div className="text-center py-6">
            <div className={`text-xs ${
              isOver ? 'text-gray-600' : 'text-gray-400'
            }`}>
              {isOver ? 'Suelta para elegir proyecto' : 'Sin proyectos'}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {isOver && (
              <div className="mb-2 p-2 bg-gray-50 border border-gray-200 rounded-sm text-center">
                <p className="text-xs text-gray-600">
                  Suelta para seleccionar proyecto
                </p>
              </div>
            )}
            
            {clientProjects.map(project => {
              const projectAssignments = assignments.filter(a => a.project_id === project.id);
              const projectHours = projectAssignments.reduce((sum, a) => sum + (a.assigned_hours || 0), 0);
              
              return (
                <div key={project.id} className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
                        <Briefcase className="w-2.5 h-2.5 text-gray-500" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-900">{project.name}</span>
                        <div className="text-xs text-gray-500">{project.status || 'Activo'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-gray-700">
                        {projectHours.toFixed(1)}h
                      </div>
                      <div className="text-xs text-gray-500">
                        {projectAssignments.length}
                      </div>
                    </div>
                  </div>
                  
                  {projectAssignments.length > 0 ? (
                    <div className="space-y-1">
                      {(expandedProjects.has(project.id) ? projectAssignments : projectAssignments.slice(0, 2)).map(assignment => {
                        const member = members.find(m => m.id === assignment.member_id);
                        if (!member) return null;
                        
                        return (
                          <EditableAssignmentInClient
                            key={assignment.id}
                            assignment={assignment}
                            member={member}
                            project={project}
                            onUpdateHours={onUpdateHours}
                          />
                        );
                      })}
                      
                      {projectAssignments.length > 2 && (
                        <button
                          onClick={() => toggleProjectExpansion(project.id)}
                          className="w-full text-xs text-gray-500 hover:text-gray-700 text-center py-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          {expandedProjects.has(project.id) ? (
                            <div className="flex items-center justify-center space-x-1">
                              <span>Ver menos</span>
                              <ChevronUp className="w-3 h-3" />
                            </div>
                          ) : (
                            <span>+{projectAssignments.length - 2} más</span>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 text-center py-2">
                      Sin asignaciones
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const CapacityKanban = ({ weekStartDate }) => {
  // Minimal styles only
  const customStyles = `
    /* Smooth animations for department expand/collapse */
    .department-content {
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .department-content.collapsed {
      max-height: 0;
      opacity: 0;
      padding: 0 8px;
    }
    
    .department-content.expanded {
      max-height: 1000px;
      opacity: 1;
      padding: 8px;
    }
    
    .chevron-rotate {
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .department-header {
      transition: all 0.15s ease-in-out;
    }
    
    .department-header:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }
  `;

  const [currentWeek, setCurrentWeek] = useState(weekStartDate || '');
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [members, setMembers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [dragData, setDragData] = useState(null);
  const [viewMode, setViewMode] = useState('projects'); // 'projects' o 'clients'
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [expandedDepartments, setExpandedDepartments] = useState(
    new Set(['Development', 'Infrastructure']) // Solo departamentos principales expandidos por defecto
  );

  const { getCurrentWeek, addWeeks, formatWeekRange } = useWeekUtils();
  const { copyWeek, loading: copyLoading } = useBulkOperations();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Actualizar cuando cambie la prop
  useEffect(() => {
    if (weekStartDate) {
      setCurrentWeek(weekStartDate);
    } else {
      setCurrentWeek(getCurrentWeek());
    }
  }, [weekStartDate, getCurrentWeek]);

  // Función para cargar datos
  const loadData = async () => {
    if (!currentWeek) {
      console.log('loadData: No currentWeek, skipping');
      return;
    }

    console.log('loadData: Loading data for week:', currentWeek);
    try {
      setLoading(true);
      const [projectsResponse, clientsResponse, membersResponse, assignmentsResponse] = await Promise.all([
        projectsApi.getAll(),
        clientsApi.getAll(),
        capacityApi.getAllTeamMembers(),
        capacityApi.getAssignmentsByWeek(currentWeek)
      ]);

      console.log('loadData: API responses:', {
        projects: projectsResponse.data?.length,
        clients: clientsResponse.data?.length,
        members: membersResponse.data?.length,
        assignments: assignmentsResponse.data?.length
      });

      setProjects(projectsResponse.data?.filter(p => p.status === 'active') || []);
      setClients(clientsResponse.data || []);
      setMembers(membersResponse.data || []);
      setAssignments(assignmentsResponse.data || []);
      
      console.log('loadData: Data loaded successfully for week:', currentWeek);
    } catch (error) {
      console.error('Error loading data for week:', currentWeek, error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos cuando cambia la semana
  useEffect(() => {
    console.log('useEffect triggered - currentWeek changed to:', currentWeek);
    loadData();
  }, [currentWeek]);

  // Función para mostrar notificaciones
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Función para toggle de departamentos
  const toggleDepartment = (deptName) => {
    setExpandedDepartments(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(deptName)) {
        newExpanded.delete(deptName);
      } else {
        newExpanded.add(deptName);
      }
      return newExpanded;
    });
  };

  // Función para expandir/colapsar todos los departamentos
  const toggleAllDepartments = () => {
    const allDepartmentNames = membersByDepartment.map(([deptName]) => deptName);
    const allExpanded = allDepartmentNames.every(dept => expandedDepartments.has(dept));
    
    if (allExpanded) {
      setExpandedDepartments(new Set()); // Colapsar todos
    } else {
      setExpandedDepartments(new Set(allDepartmentNames)); // Expandir todos
    }
  };

  // Calcular utilización de miembros
  const membersWithUtilization = useMemo(() => {
    return members.map(member => {
      const memberAssignments = assignments.filter(a => a.member_id === member.id);
      const totalAssigned = memberAssignments.reduce((sum, a) => sum + (a.assigned_hours || 0), 0);
      return {
        ...member,
        totalAssigned,
        utilizationPercentage: (totalAssigned / member.weekly_capacity) * 100
      };
    });
  }, [members, assignments]);

  // Miembros sin asignar
  const unassignedMembers = membersWithUtilization.filter(member => {
    const hasAssignments = assignments.some(a => a.member_id === member.id);
    return !hasAssignments || member.totalAssigned < member.weekly_capacity;
  });

  // Agrupar miembros por departamento
  const membersByDepartment = useMemo(() => {
    const departments = {
      'Development': { 
        members: [], 
        icon: Code, 
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        iconColor: 'text-emerald-600',
        textColor: 'text-emerald-800'
      },
      'Infrastructure': { 
        members: [], 
        icon: Server, 
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-600',
        textColor: 'text-blue-800'
      },
      'Quality': { 
        members: [], 
        icon: UserCheck, 
        bgColor: 'bg-violet-50',
        borderColor: 'border-violet-200',
        iconColor: 'text-violet-600',
        textColor: 'text-violet-800'
      },
      'Design': { 
        members: [], 
        icon: Target, 
        bgColor: 'bg-pink-50',
        borderColor: 'border-pink-200',
        iconColor: 'text-pink-600',
        textColor: 'text-pink-800'
      },
      'Management': { 
        members: [], 
        icon: Users, 
        bgColor: 'bg-slate-50',
        borderColor: 'border-slate-200',
        iconColor: 'text-slate-600',
        textColor: 'text-slate-800'
      },
      'Externos': { 
        members: [], 
        icon: Building, 
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        iconColor: 'text-orange-600',
        textColor: 'text-orange-800'
      }
    };

    unassignedMembers.forEach(member => {
      const dept = member.department || 'Externos';
      if (departments[dept]) {
        departments[dept].members.push(member);
      } else {
        departments['Externos'].members.push(member);
      }
    });

    // Filtrar solo departamentos con miembros y ordenar por prioridad
    const departmentOrder = ['Development', 'Infrastructure', 'Quality', 'Design', 'Management', 'Externos'];
    return Object.entries(departments)
      .filter(([_, dept]) => dept.members.length > 0)
      .sort(([a], [b]) => departmentOrder.indexOf(a) - departmentOrder.indexOf(b));
  }, [unassignedMembers]);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;


    // Manejar drag de miembros sobre proyectos o clientes
    if (activeData?.type === 'member') {
      if (overData?.type === 'project') {
        setDragData({
          member: activeData.member,
          project: overData.project,
          mode: 'project'
        });
      } else if (overData?.type === 'client') {
        setDragData({
          member: activeData.member,
          client: overData.client,
          mode: 'client'
        });
      }
    }
    
    // Manejar drag de asignaciones entre proyectos
    if (activeData?.type === 'assignment') {
      if (overData?.type === 'project' && overData.project.id !== activeData.project.id) {
        setDragData({
          assignment: activeData.assignment,
          member: activeData.member,
          sourceProject: activeData.project,
          targetProject: overData.project,
          mode: 'move_assignment'
        });
      } else if (overData?.type === 'client') {
        // Mover asignación a un cliente (requiere seleccionar proyecto)
        setDragData({
          assignment: activeData.assignment,
          member: activeData.member,
          sourceProject: activeData.project,
          targetClient: overData.client,
          mode: 'move_to_client'
        });
      }
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    setActiveId(null);
    
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Crear asignación cuando se arrastra un miembro
    if (activeData?.type === 'member') {
      if (overData?.type === 'project') {
        setDragData({
          member: activeData.member,
          project: overData.project,
          mode: 'project'
        });
        setShowAssignmentModal(true);
      } else if (overData?.type === 'client') {
        setDragData({
          member: activeData.member,
          client: overData.client,
          mode: 'client'
        });
        setShowProjectSelector(true);
      }
    }
    
    // Mover asignación entre proyectos
    if (activeData?.type === 'assignment') {
      if (overData?.type === 'project' && overData.project.id !== activeData.project.id) {
        handleMoveAssignment(activeData.assignment, activeData.project, overData.project);
      } else if (overData?.type === 'client') {
        // Mover asignación a un cliente (requiere seleccionar proyecto)
        setDragData({
          assignment: activeData.assignment,
          member: activeData.member,
          sourceProject: activeData.project,
          client: overData.client,
          mode: 'move_to_client'
        });
        setShowProjectSelector(true);
      }
    }
  };

  const handleMoveAssignment = async (assignment, sourceProject, targetProject) => {
    try {
      console.log('handleMoveAssignment called with:', {
        assignmentId: assignment.id,
        sourceProjectId: sourceProject.id,
        targetProjectId: targetProject.id,
        memberId: assignment.member_id
      });

      // Verificar si ya existe una asignación para este miembro en el proyecto destino
      const existingAssignment = assignments.find(a => 
        a.project_id === targetProject.id && 
        a.member_id === assignment.member_id && 
        a.week_start_date === currentWeek
      );

      if (existingAssignment) {
        showNotification(
          `${assignment.member?.name || 'El miembro'} ya está asignado a ${targetProject.name} esta semana. Combina las asignaciones manualmente.`, 
          'error'
        );
        return;
      }

      // Actualizar la asignación con el nuevo proyecto
      const updatedAssignment = {
        ...assignment,
        project_id: targetProject.id,
        notes: `${assignment.notes || ''} (Movido desde ${sourceProject.name})`.trim()
      };

      console.log('Calling updateAssignment with:', {
        id: assignment.id,
        updatedAssignment
      });

      await capacityApi.updateAssignment(assignment.id, updatedAssignment);
      
      console.log('updateAssignment successful, reloading data...');
      
      // Recargar datos directamente llamando loadData()
      await loadData();
      
      const memberName = assignment.member?.name || 'Miembro';
      showNotification(
        `${memberName} movido de ${sourceProject.name} a ${targetProject.name}`, 
        'success'
      );
      
    } catch (error) {
      console.error('Error moving assignment - Full error object:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      showNotification(`Error moviendo asignación: ${error.message}`, 'error');
    }
  };

  const handleUpdateHours = async (assignmentId, newHours) => {
    try {
      const assignment = assignments.find(a => a.id === assignmentId);
      if (!assignment) {
        showNotification('Asignación no encontrada', 'error');
        return;
      }

      // Actualizar la asignación con las nuevas horas
      const updatedAssignment = {
        ...assignment,
        assigned_hours: newHours
      };

      console.log('Actualizando horas de asignación:', {
        assignmentId,
        oldHours: assignment.assigned_hours,
        newHours,
        updatedAssignment
      });

      await capacityApi.updateAssignment(assignmentId, updatedAssignment);
      
      // Recargar datos
      await loadData();
      
      const member = members.find(m => m.id === assignment.member_id);
      const project = projects.find(p => p.id === assignment.project_id);
      showNotification(
        `Horas de ${member?.name || 'miembro'} en ${project?.name || 'proyecto'} actualizadas a ${newHours}h`, 
        'success'
      );
      
    } catch (error) {
      console.error('Error updating assignment hours:', error);
      showNotification(`Error actualizando horas: ${error.message}`, 'error');
    }
  };

  const handleCreateAssignment = async (assignmentData) => {
    try {
      const newAssignment = {
        project_id: dragData.project.id,
        member_id: dragData.member.id,
        week_start_date: currentWeek,
        assigned_hours: parseFloat(assignmentData.hours),
        assignment_type: assignmentData.type || 'Compromiso',
        priority: assignmentData.priority || 'Media',
        is_billable: assignmentData.billable !== false,
        notes: assignmentData.notes || `Asignación creada por drag & drop`
      };

      await capacityApi.createAssignment(newAssignment);
      
      // Recargar datos
      const assignmentsResponse = await capacityApi.getAssignmentsByWeek(currentWeek);
      setAssignments(assignmentsResponse.data || []);
      
      showNotification(`${dragData.member.name} asignado a ${dragData.project.name} (${assignmentData.hours}h)`, 'success');
      
      setShowAssignmentModal(false);
      setDragData(null);
    } catch (error) {
      console.error('Error creating assignment:', error);
      
      // Manejar error específico de asignación duplicada
      if (error.message?.includes('capacity_assignments_project_id_member_id_week_start_date_key')) {
        showNotification('Este miembro ya está asignado a este proyecto para esta semana. Por favor, edita la asignación existente.', 'error');
      } else if (error.message?.includes('violates row-level security policy')) {
        showNotification('Error de permisos. Contacta al administrador para configurar las políticas de base de datos.', 'error');
      } else if (error.message?.includes('unrecognized format')) {
        showNotification('Error en la configuración de alertas. Las asignaciones funcionan pero las alertas están deshabilitadas.', 'error');
      } else {
        showNotification(`Error creando asignación: ${error.message}`, 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Custom CSS Animations */}
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      {/* Header elegante */}
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-medium text-slate-900">
                Asignación de Capacidad
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Selector de vista minimalista */}
              <div className="flex items-center text-sm">
                <button
                  onClick={() => setViewMode('projects')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    viewMode === 'projects'
                      ? 'bg-slate-800 text-white shadow-md'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  Proyectos
                </button>
                <button
                  onClick={() => setViewMode('clients')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    viewMode === 'clients'
                      ? 'bg-slate-800 text-white shadow-md'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  Clientes
                </button>
              </div>
              
              {/* Botón copiar semana */}
              <button
                onClick={() => setShowCopyModal(true)}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm"
              >
                <Copy className="w-4 h-4 text-slate-600" />
                <span className="text-slate-700">Copiar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Panel de miembros disponibles por departamento */}
          <div className="lg:col-span-1">
            <div className="bg-slate-100 border-r border-slate-300">
              {/* Header del panel de equipo */}
              <div className="p-2 border-b border-slate-300 bg-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-900">
                    Equipo ({unassignedMembers.length})
                  </h3>
                  {membersByDepartment.length > 1 && (
                    <button
                      onClick={toggleAllDepartments}
                      className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-50 border border-slate-300 rounded text-slate-700 hover:text-slate-900 transition-colors"
                      title="Expandir/Colapsar todos los departamentos"
                    >
                      {membersByDepartment.every(([deptName]) => expandedDepartments.has(deptName)) ? (
                        <span className="flex items-center space-x-1">
                          <ChevronUp className="w-3 h-3" />
                          <span>Colapsar</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1">
                          <ChevronDown className="w-3 h-3" />
                          <span>Expandir</span>
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
              
              {/* Lista de miembros por departamento */}
              <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
                {membersByDepartment.length === 0 ? (
                  <div className="text-center py-6 px-3">
                    <div className="text-xs text-emerald-800 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                      ✨ Todo el equipo asignado
                    </div>
                  </div>
                ) : (
                  membersByDepartment.map(([deptName, dept]) => (
                    <div key={deptName} className="border-b border-slate-200 last:border-b-0">
                      {/* Header del departamento con toggle */}
                      <button
                        onClick={() => toggleDepartment(deptName)}
                        className={`department-header w-full p-3 ${dept.bgColor} border-b ${dept.borderColor} hover:opacity-90 transition-all duration-200`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <dept.icon className={`w-4 h-4 ${dept.iconColor}`} />
                            <h4 className={`text-sm font-semibold ${dept.textColor}`}>
                              {deptName}
                            </h4>
                            <span className={`text-xs px-2 py-1 rounded-full bg-white/50 ${dept.textColor}`}>
                              {dept.members.length}
                            </span>
                          </div>
                          
                          {/* Chevron para indicar estado con animación mejorada */}
                          <div className={`chevron-rotate ${dept.iconColor} ${
                            expandedDepartments.has(deptName) ? 'rotate-180' : 'rotate-0'
                          }`}>
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>
                      </button>
                      
                      {/* Miembros del departamento con animación suave */}
                      <div className={`department-content ${
                        expandedDepartments.has(deptName) ? 'expanded' : 'collapsed'
                      }`}>
                        <div className="space-y-2">
                          <SortableContext 
                            items={dept.members.map(m => m.id)} 
                            strategy={verticalListSortingStrategy}
                          >
                            {dept.members.map(member => (
                              <DraggableMember
                                key={member.id}
                                member={member}
                                totalAssigned={member.totalAssigned}
                                departmentColor={deptName}
                              />
                            ))}
                          </SortableContext>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Panel de proyectos o clientes */}
          <div className="lg:col-span-3">
            {viewMode === 'projects' ? (
              <SortableContext
                items={assignments.map(a => `assignment-${a.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {projects.map(project => (
                    <ProjectDropZone
                      key={project.id}
                      project={project}
                      members={members}
                      assignments={assignments}
                      onUpdateHours={handleUpdateHours}
                    />
                  ))}
                </div>
              </SortableContext>
            ) : (
              <SortableContext
                items={assignments.map(a => `client-assignment-${a.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {clients.map(client => (
                    <ClientDropZone
                      key={client.id}
                      client={client}
                      projects={projects}
                      members={members}
                      assignments={assignments}
                      onUpdateHours={handleUpdateHours}
                    />
                  ))}
                </div>
              </SortableContext>
            )}

            {viewMode === 'projects' && projects.length === 0 && (
              <div className="text-center py-8">
                <div className="text-sm text-slate-400 bg-slate-50/50 px-4 py-3 rounded-lg border border-slate-100/50 inline-block">
                  📋 No hay proyectos activos
                </div>
              </div>
            )}

            {viewMode === 'clients' && clients.length === 0 && (
              <div className="text-center py-8">
                <div className="text-sm text-slate-400 bg-slate-50/50 px-4 py-3 rounded-lg border border-slate-100/50 inline-block">
                  🏢 No hay clientes con proyectos
                </div>
              </div>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeId && membersWithUtilization.find(m => m.id === activeId) ? (
            <DraggableMember
              member={membersWithUtilization.find(m => m.id === activeId)}
              totalAssigned={membersWithUtilization.find(m => m.id === activeId)?.totalAssigned}
              isOverlay={true}
            />
          ) : activeId && (activeId.startsWith('assignment-') || activeId.startsWith('client-assignment-')) ? (
            (() => {
              const assignmentId = activeId.startsWith('client-assignment-') 
                ? parseInt(activeId.replace('client-assignment-', ''))
                : parseInt(activeId.replace('assignment-', ''));
              const assignment = assignments.find(a => a.id === assignmentId);
              const member = assignment ? members.find(m => m.id === assignment.member_id) : null;
              
              return assignment && member ? (
                <div className="flex items-center justify-between text-xs bg-white p-2 rounded-md border-2 border-blue-300 shadow-lg max-w-48">
                  <span className="text-gray-900 truncate font-medium">{member.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600 font-bold">{assignment.assigned_hours}h</span>
                    <div className={`w-3 h-3 rounded-full shadow-sm ${
                      assignment.priority === 'Alta' ? 'bg-red-500' :
                      assignment.priority === 'Media' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`} />
                  </div>
                </div>
              ) : null;
            })()
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal selector de proyecto (para vista de clientes) */}
      {showProjectSelector && dragData && (
        <ProjectSelectorModal
          member={dragData.member}
          client={dragData.client}
          projects={projects.filter(p => p.client_id === dragData.client.id)}
          onSelectProject={(project) => {
            if (dragData.mode === 'move_to_client') {
              // Mover asignación existente directamente al proyecto seleccionado
              handleMoveAssignment(dragData.assignment, dragData.sourceProject, project);
              setShowProjectSelector(false);
              setDragData(null);
            } else {
              // Crear nueva asignación
              setDragData({
                ...dragData,
                project,
                mode: 'project'
              });
              setShowProjectSelector(false);
              setShowAssignmentModal(true);
            }
          }}
          onCancel={() => {
            setShowProjectSelector(false);
            setDragData(null);
          }}
        />
      )}

      {/* Modal de asignación */}
      {showAssignmentModal && dragData && (
        <AssignmentModal
          member={dragData.member}
          project={dragData.project}
          client={dragData.client}
          mode={dragData.mode}
          onSave={handleCreateAssignment}
          onCancel={() => {
            setShowAssignmentModal(false);
            setDragData(null);
          }}
        />
      )}

      {/* Modal de copiar semana */}
      {showCopyModal && (
        <CopyWeekModal
          currentWeek={currentWeek}
          onCopy={async (sourceWeek, targetWeek) => {
            const result = await copyWeek(sourceWeek, targetWeek);
            if (result.success) {
              setShowCopyModal(false);
              // Recargar datos si la semana objetivo es la actual
              if (targetWeek === currentWeek) {
                loadData();
              }
              showNotification(result.message, 'success');
            } else {
              showNotification(`Error: ${result.error}`, 'error');
            }
          }}
          onCancel={() => setShowCopyModal(false)}
          loading={copyLoading}
          addWeeks={addWeeks}
          formatWeekRange={formatWeekRange}
        />
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

// Modal para seleccionar proyecto cuando se arrastra a cliente - Diseño moderno consistente
const ProjectSelectorModal = ({ member, client, projects, onSelectProject, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header limpio */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Building className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Seleccionar Proyecto
              </h3>
              <p className="text-gray-500 text-sm">
                Elige el proyecto específico para la asignación
              </p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Información de la asignación */}
        <div className="p-6 border-b border-gray-200">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{member.name}</div>
                  <div className="text-sm text-gray-600">{member.role}</div>
                </div>
              </div>
              
              <div className="text-2xl text-blue-400">→</div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center">
                  <Building className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{client.name}</div>
                  <div className="text-sm text-gray-600">Cliente</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de proyectos */}
        <div className="p-6 overflow-y-auto max-h-96">
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-700 mb-2">
                Sin proyectos disponibles
              </h4>
              <p className="text-sm text-gray-500">
                Este cliente no tiene proyectos activos en este momento
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project)}
                  className="w-full p-3 text-left bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <Briefcase className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {project.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {project.status || 'Activo'}
                        </div>
                      </div>
                    </div>
                    <div className="text-gray-400 opacity-0 group-hover:opacity-100 group-hover:text-blue-500 transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer con botones elegantes */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onCancel}
            className="w-full bg-white text-gray-700 py-2.5 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 hover:border-gray-400 font-medium transition-all duration-200 shadow-sm hover:shadow"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal para configurar la asignación - Diseño profesional
const AssignmentModal = ({ member, project, client, mode, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    hours: '',
    type: 'Compromiso',
    priority: 'Media',
    billable: true,
    notes: ''
  });

  const availableHours = member.weekly_capacity - (member.totalAssigned || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.hours || parseFloat(formData.hours) <= 0) {
      alert('Por favor ingresa un número válido de horas');
      return;
    }
    if (parseFloat(formData.hours) > member.weekly_capacity) {
      alert(`Las horas no pueden exceder la capacidad semanal (${member.weekly_capacity}h)`);
      return;
    }
    onSave(formData);
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'Compromiso': return '🎯';
      case 'Reserva': return '📋';
      case 'Disponible': return '⚡';
      default: return '📝';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'Alta': return 'from-red-500 to-red-600';
      case 'Media': return 'from-yellow-500 to-orange-500';
      case 'Baja': return 'from-green-500 to-emerald-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header limpio */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Crear Asignación
              </h3>
              <p className="text-gray-500 text-sm">
                Configura los detalles de la asignación
              </p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Información del miembro y proyecto */}
        <div className="p-6 border-b border-gray-200">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{member.name}</div>
                  <div className="text-sm text-gray-600">{member.role}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Disponible: {availableHours.toFixed(1)}h de {member.weekly_capacity}h
                  </div>
                </div>
              </div>
              
              <div className="text-2xl text-blue-400">→</div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{project.name}</div>
                  {mode === 'client' && client && (
                    <div className="text-sm text-gray-600">{client.name}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {project.status || 'Proyecto activo'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-96">
          {/* Horas asignadas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Horas asignadas *
            </label>
            <div className="relative">
              <input
                type="number"
                min="0.5"
                step="0.5"
                max={member.weekly_capacity}
                required
                value={formData.hours}
                onChange={(e) => setFormData({...formData, hours: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Ej: 20"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                horas
              </div>
            </div>
            {formData.hours && parseFloat(formData.hours) > availableHours && (
              <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                Excedería la capacidad disponible ({availableHours.toFixed(1)}h)
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tipo de asignación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de asignación
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="Compromiso">Compromiso</option>
                <option value="Reserva">Reserva</option>
                <option value="Disponible">Disponible</option>
              </select>
            </div>

            {/* Prioridad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prioridad
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baja">Baja</option>
              </select>
            </div>
          </div>

          {/* Facturable */}
          <div>
            <label className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={formData.billable}
                onChange={(e) => setFormData({...formData, billable: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 focus:ring-1"
              />
              <span className="ml-3 text-sm font-medium text-gray-700">
                Proyecto facturable al cliente
              </span>
            </label>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas adicionales
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows="3"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              placeholder="Información adicional sobre esta asignación..."
            />
          </div>
        </form>

        {/* Footer con botones */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-white text-gray-700 py-2.5 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium transition-colors shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Crear Asignación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal para copiar semana - Diseño profesional
const CopyWeekModal = ({ currentWeek, onCopy, onCancel, loading, addWeeks, formatWeekRange }) => {
  const [sourceWeek, setSourceWeek] = useState(addWeeks(currentWeek, -1));
  const [targetWeek, setTargetWeek] = useState(currentWeek);

  const handleCopy = () => {
    if (sourceWeek === targetWeek) {
      alert('La semana origen y destino no pueden ser iguales');
      return;
    }
    onCopy(sourceWeek, targetWeek);
  };

  const generateWeekOptions = () => {
    const options = [];
    // Generar opciones para 4 semanas anteriores y 4 posteriores
    for (let i = -4; i <= 4; i++) {
      const week = addWeeks(currentWeek, i);
      options.push({
        value: week,
        label: i === 0 ? `${formatWeekRange(week)} (Actual)` : formatWeekRange(week)
      });
    }
    return options;
  };

  const weekOptions = generateWeekOptions();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-6 rounded-t-2xl">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Copy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                Copiar Asignaciones
              </h3>
              <p className="text-green-100 text-sm">
                Duplicar asignaciones entre semanas
              </p>
            </div>
          </div>
        </div>
        
        {/* Contenido */}
        <div className="p-6 space-y-4">
          {/* Semana origen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Copiar desde (semana origen)
            </label>
            <select
              value={sourceWeek}
              onChange={(e) => setSourceWeek(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              {weekOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Semana destino */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Copiar hacia (semana destino)
            </label>
            <select
              value={targetWeek}
              onChange={(e) => setTargetWeek(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              {weekOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Información */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <div className="w-4 h-4 text-blue-600 mt-0.5">
                ℹ️
              </div>
              <div className="text-sm text-blue-800">
                <p className="font-medium">¿Qué se copiará?</p>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• Todas las asignaciones activas de la semana origen</li>
                  <li>• Horas, prioridades y tipos de asignación</li>
                  <li>• Se evitarán duplicados automáticamente</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 bg-white text-gray-700 py-2 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleCopy}
              disabled={loading || sourceWeek === targetWeek}
              className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Copiando...</span>
                </div>
              ) : (
                'Copiar Asignaciones'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CapacityKanban;