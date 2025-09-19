import { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
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
  ChevronLeft,
  ChevronRight,
  Calendar,
  Building,
  ToggleLeft,
  ToggleRight,
  Target,
  Zap,
  Users,
  TrendingUp
} from 'lucide-react';
import { capacityApi, projectsApi, clientsApi } from '../services/supabaseApi';
import { useWeekUtils } from '../hooks/useCapacityCalculations';

// Componente para miembro draggable con diseño profesional
const DraggableMember = ({ member, totalAssigned = 0, isOverlay = false }) => {
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

// Componente para proyecto (zona de drop) con diseño profesional
const ProjectDropZone = ({ project, members, assignments, onDropMember }) => {
  const projectAssignments = assignments.filter(a => a.project_id === project.id);
  const totalHours = projectAssignments.reduce((sum, a) => sum + (a.assigned_hours || 0), 0);
  
  const {
    setNodeRef,
    isOver,
  } = useSortable({
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
            {projectAssignments.slice(0, 2).map(assignment => {
              const member = members.find(m => m.id === assignment.member_id);
              if (!member) return null;
              
              return (
                <div key={assignment.id} className="flex items-center justify-between text-xs bg-white p-1.5 rounded-md border border-gray-200">
                  <span className="text-gray-900 truncate">{member.name}</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-600 font-medium">{assignment.assigned_hours}h</span>
                    <div className={`w-2 h-2 rounded-full shadow-sm ${
                      assignment.priority === 'Alta' ? 'bg-red-500' :
                      assignment.priority === 'Media' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`} />
                  </div>
                </div>
              );
            })}
            
            {projectAssignments.length > 2 && (
              <div className="text-xs text-gray-400 text-center py-0.5">
                +{projectAssignments.length - 2} más
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Componente para cliente (zona de drop) con diseño profesional
const ClientDropZone = ({ client, projects, members, assignments, onSelectProject }) => {
  const clientProjects = projects.filter(p => p.client_id === client.id);
  const clientAssignments = assignments.filter(a => 
    clientProjects.some(p => p.id === a.project_id)
  );
  const totalHours = clientAssignments.reduce((sum, a) => sum + (a.assigned_hours || 0), 0);
  
  const {
    setNodeRef,
    isOver,
  } = useSortable({
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
                      {projectAssignments.slice(0, 2).map(assignment => {
                        const member = members.find(m => m.id === assignment.member_id);
                        if (!member) return null;
                        
                        return (
                          <div key={assignment.id} className="flex items-center justify-between text-xs bg-white p-1.5 rounded-md border border-gray-200">
                            <span className="text-gray-900 truncate">{member.name}</span>
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-600 font-medium">{assignment.assigned_hours}h</span>
                              <div className={`w-2 h-2 rounded-full shadow-sm ${
                                assignment.priority === 'Alta' ? 'bg-red-500' :
                                assignment.priority === 'Media' ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`} />
                            </div>
                          </div>
                        );
                      })}
                      
                      {projectAssignments.length > 2 && (
                        <div className="text-xs text-gray-400 text-center py-0.5">
                          +{projectAssignments.length - 2} más
                        </div>
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

const CapacityKanban = () => {
  // Minimal styles only
  const customStyles = `
    /* Minimal clean styles */
  `;

  const [currentWeek, setCurrentWeek] = useState('');
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

  const { getCurrentWeek, addWeeks, formatWeekRange } = useWeekUtils();

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

  // Inicializar con semana actual
  useEffect(() => {
    setCurrentWeek(getCurrentWeek());
  }, [getCurrentWeek]);

  // Cargar datos
  useEffect(() => {
    const loadData = async () => {
      if (!currentWeek) return;

      try {
        setLoading(true);
        const [projectsResponse, clientsResponse, membersResponse, assignmentsResponse] = await Promise.all([
          projectsApi.getAll(),
          clientsApi.getAll(),
          capacityApi.getAllTeamMembers(),
          capacityApi.getAssignmentsByWeek(currentWeek)
        ]);

        setProjects(projectsResponse.data?.filter(p => p.status === 'active') || []);
        setClients(clientsResponse.data || []);
        setMembers(membersResponse.data || []);
        setAssignments(assignmentsResponse.data || []);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentWeek]);

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
      
      setShowAssignmentModal(false);
      setDragData(null);
    } catch (error) {
      console.error('Error creating assignment:', error);
      
      // Manejar error específico de asignación duplicada
      if (error.message?.includes('capacity_assignments_project_id_member_id_week_start_date_key')) {
        alert('Este miembro ya está asignado a este proyecto para esta semana. Por favor, edita la asignación existente en lugar de crear una nueva.');
      } else if (error.message?.includes('violates row-level security policy')) {
        alert('Error de permisos. Por favor, contacta al administrador para configurar las políticas de base de datos.');
      } else if (error.message?.includes('unrecognized format')) {
        alert('Error en la configuración de alertas. Las asignaciones funcionan pero las alertas están deshabilitadas.');
      } else {
        alert('Error creando asignación: ' + error.message);
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
              
              {/* Navegación de semanas */}
              <div className="flex items-center text-sm bg-white rounded-lg px-2 border border-slate-300 shadow-sm">
                <button
                  onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}
                  className="p-1 hover:bg-slate-100 hover:text-slate-900 rounded transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                
                <div className="px-3 py-1 min-w-[140px] text-center text-slate-900 font-medium">
                  {formatWeekRange(currentWeek)}
                </div>
                
                <button
                  onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                  className="p-1 hover:bg-slate-100 hover:text-slate-900 rounded transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
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
          {/* Panel de miembros disponibles con diseño profesional */}
          <div className="lg:col-span-1">
            <div className="bg-slate-100 border-r border-slate-300">
              {/* Header del panel de equipo */}
              <div className="p-2 border-b border-slate-300 bg-slate-200">
                <h3 className="text-sm font-medium text-slate-900">
                  Equipo ({membersWithUtilization.length})
                </h3>
              </div>
              
              {/* Lista de miembros */}
              <div className="p-3 space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                <SortableContext 
                  items={unassignedMembers.map(m => m.id)} 
                  strategy={verticalListSortingStrategy}
                >
                  {unassignedMembers.map(member => (
                    <DraggableMember
                      key={member.id}
                      member={member}
                      totalAssigned={member.totalAssigned}
                    />
                  ))}
                </SortableContext>
                
                {unassignedMembers.length === 0 && (
                  <div className="text-center py-6">
                    <div className="text-xs text-emerald-800 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                      ✨ Todo el equipo asignado
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Panel de proyectos o clientes */}
          <div className="lg:col-span-3">
            {viewMode === 'projects' ? (
              <SortableContext
                items={projects.map(p => `project-${p.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {projects.map(project => (
                    <ProjectDropZone
                      key={project.id}
                      project={project}
                      members={members}
                      assignments={assignments}
                    />
                  ))}
                </div>
              </SortableContext>
            ) : (
              <SortableContext
                items={clients.map(c => `client-${c.id}`)}
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
            setDragData({
              ...dragData,
              project,
              mode: 'project'
            });
            setShowProjectSelector(false);
            setShowAssignmentModal(true);
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
    </div>
  );
};

// Modal para seleccionar proyecto cuando se arrastra a cliente - Diseño profesional
const ProjectSelectorModal = ({ member, client, projects, onSelectProject, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all duration-300 scale-100">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-blue-500 to-sky-600 p-6 rounded-t-2xl">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Building className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                Seleccionar Proyecto
              </h3>
              <p className="text-blue-100 text-sm">
                Elige el proyecto específico para la asignación
              </p>
            </div>
          </div>
        </div>
        
        {/* Información de la asignación */}
        <div className="p-6 border-b border-gray-100">
          <div className="bg-gradient-to-r from-blue-50 to-sky-50 p-4 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">{member.name}</div>
                  <div className="text-sm text-gray-600">{member.role}</div>
                </div>
              </div>
              <div className="text-2xl">→</div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center">
                  <Building className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">{client.name}</div>
                  <div className="text-sm text-gray-600">Cliente</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de proyectos */}
        <div className="p-6">
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
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
              projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project)}
                  className="w-full p-4 text-left border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-sky-50 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-purple-100 rounded-lg flex items-center justify-center group-hover:from-violet-200 group-hover:to-purple-200 transition-colors">
                        <Briefcase className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                          {project.name}
                        </div>
                        <div className="text-sm text-gray-500 font-medium">
                          {project.status || 'Activo'}
                        </div>
                      </div>
                    </div>
                    <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer con botones */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 bg-white text-gray-700 py-3 px-4 rounded-xl border border-gray-300 hover:bg-gray-50 hover:border-gray-400 font-semibold transition-all duration-200"
            >
              Cancelar
            </button>
          </div>
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
        {/* Header simple */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4 text-gray-600" />
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
        </div>
        
        {/* Información del miembro y proyecto */}
        <div className="p-6 border-b border-gray-200">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{member.name}</div>
                  <div className="text-sm text-gray-500">{member.role}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Disponible: {availableHours.toFixed(1)}h de {member.weekly_capacity}h
                  </div>
                </div>
              </div>
              
              <div className="text-2xl text-gray-400">→</div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-gray-600" />
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{project.name}</div>
                  {mode === 'client' && client && (
                    <div className="text-sm text-gray-500">{client.name}</div>
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
              className="flex-1 bg-white text-gray-700 py-2 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Crear Asignación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CapacityKanban;