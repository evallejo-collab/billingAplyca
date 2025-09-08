import { useState, useEffect } from 'react';
import { projectsApi, clientsApi, contractsApi } from '../services/supabaseApi';
import ConfirmModal from './ConfirmModal';
import { 
  Plus, 
  Search, 
  Folder, 
  Building, 
  FileText, 
  Clock, 
  DollarSign, 
  Edit2, 
  Trash2,
  Eye,
  AlertCircle,
  Filter,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Pause,
  Target
} from 'lucide-react';
import ProjectModal from './ProjectModal';
import ProjectWizard from './ProjectWizard';
import ProjectDetailsModal from './ProjectDetailsModal';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState(''); // 'contract', 'independent', or ''
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all projects
      const projectsResponse = await projectsApi.getAll();
      setProjects(projectsResponse.data);

      // Load clients for dropdowns
      const clientsResponse = await clientsApi.getAll();
      setClients(clientsResponse.data);

      // Load contracts for dropdowns
      const contractsResponse = await contractsApi.getAll();
      setContracts(contractsResponse.data);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  const handleSearch = () => {
    // Filter projects based on search term and filters
    // This could be enhanced to call API with filters
    loadData();
  };

  const handleCreateProject = () => {
    setSelectedProject(null);
    setIsEditing(false);
    setIsWizardOpen(true);
  };

  const handleEditProject = (project) => {
    setSelectedProject(project);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleViewProject = (project) => {
    setSelectedProject(project);
    setIsDetailsModalOpen(true);
  };

  const handleDeleteProject = (project) => {
    setProjectToDelete(project);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    
    try {
      const response = await projectsApi.delete(projectToDelete.id);
      if (response.success) {
        loadData();
        setProjectToDelete(null);
      } else {
        alert('Error al eliminar el proyecto');
      }
    } catch (err) {
      alert(err.message || 'Error al eliminar el proyecto');
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
    setIsEditing(false);
  };

  const handleWizardClose = () => {
    setIsWizardOpen(false);
    setSelectedProject(null);
    setIsEditing(false);
  };

  const handleProjectSaved = () => {
    loadData();
    handleModalClose();
  };

  const handleProjectSavedFromWizard = () => {
    loadData();
    handleWizardClose();
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { label: 'ACTIVO', className: 'bg-green-50 text-green-800 border border-green-200', icon: CheckCircle },
      completed: { label: 'LISTO FACTURAR', className: 'bg-blue-50 text-blue-800 border border-blue-200', icon: CheckCircle },
      ready_to_invoice: { label: 'PEND. FACTURAR', className: 'bg-orange-50 text-orange-800 border border-orange-200', icon: DollarSign },
      invoiced: { label: 'FACTURADO', className: 'bg-purple-50 text-purple-800 border border-purple-200', icon: CheckCircle },
      on_hold: { label: 'EN PAUSA', className: 'bg-yellow-50 text-yellow-800 border border-yellow-200', icon: Pause },
    };

    const config = statusConfig[status] || { label: status?.toUpperCase() || 'DESCONOCIDO', className: 'bg-gray-50 text-gray-800 border border-gray-200', icon: Target };
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${config.className}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const getProjectType = (project) => {
    if (project.is_independent) {
      return {
        label: 'INDEPENDIENTE',
        className: 'bg-purple-50 text-purple-800 border border-purple-200',
        icon: Building
      };
    } else {
      return {
        label: 'CONTRATO',
        className: 'bg-blue-50 text-blue-800 border border-blue-200',
        icon: FileText
      };
    }
  };

  const getClientName = (project) => {
    if (project.is_independent) {
      return project.client_name || 'Cliente Independiente';
    } else {
      const client = clients.find(c => c.id === project.client_id);
      return client ? client.name : 'Cliente no encontrado';
    }
  };

  const calculateTimeProgress = (startDate, endDate) => {
    if (!startDate || !endDate) return { percentage: 0, isOverdue: false, daysRemaining: null };

    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Calculate total duration and elapsed time
    const totalDuration = end.getTime() - start.getTime();
    const elapsedTime = now.getTime() - start.getTime();
    
    // Calculate percentage (clamped between 0 and 100)
    const percentage = Math.max(0, Math.min(100, (elapsedTime / totalDuration) * 100));
    
    // Check if overdue
    const isOverdue = now > end;
    
    // Calculate days remaining
    const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return { percentage, isOverdue, daysRemaining };
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = !searchTerm || 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getClientName(project).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || project.status === statusFilter;
    
    const matchesType = !typeFilter || 
      (typeFilter === 'independent' && project.is_independent) ||
      (typeFilter === 'contract' && !project.is_independent);

    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando proyectos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Gestión de Proyectos</h1>
          <p className="text-sm text-gray-600 mt-1">Administración y seguimiento de proyectos activos e independientes</p>
        </div>
        <button
          onClick={handleCreateProject}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-3 h-3 mr-1" />
          NUEVO PROYECTO
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar proyectos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="completed">Completado - Listo para facturar</option>
              <option value="ready_to_invoice">Finalizado - Pendiente por facturar</option>
              <option value="invoiced">Facturado</option>
              <option value="on_hold">En Pausa</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="contract">De Contrato</option>
              <option value="independent">Independientes</option>
            </select>
          </div>
        </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => {
          const projectType = getProjectType(project);
          const TypeIcon = projectType.icon;
          
          return (
            <div key={project.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-sm transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${projectType.className}`}>
                        <TypeIcon className="w-3 h-3 mr-1" />
                        {projectType.label}
                      </span>
                      {getStatusBadge(project.status)}
                    </div>
                  </div>
                  <div className="flex space-x-1 ml-2">
                    <button
                      onClick={() => handleViewProject(project)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Ver detalles"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditProject(project)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Client Info */}
                <div className="mb-4">
                  <div className="flex items-center text-sm text-gray-600 mb-1">
                    <User className="w-4 h-4 mr-2" />
                    {getClientName(project)}
                  </div>
                  {!project.is_independent && project.contract_number && (
                    <div className="flex items-center text-sm text-gray-600">
                      <FileText className="w-4 h-4 mr-2" />
                      Contrato: {project.contract_number}
                    </div>
                  )}
                </div>

                {/* Hours Info */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="text-center p-2 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-center justify-center mb-1">
                      <Target className="w-4 h-4 text-gray-600 mr-1" />
                      <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Estimadas</span>
                    </div>
                    <p className="text-base font-semibold text-gray-900">{project.estimated_hours || 0}h</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-center justify-center mb-1">
                      <Clock className="w-4 h-4 text-gray-600 mr-1" />
                      <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Utilizadas</span>
                    </div>
                    <p className="text-base font-semibold text-gray-900">{project.used_hours || 0}h</p>
                  </div>
                  <div className={`text-center p-2 rounded border ${
                    (project.remaining_hours || 0) <= 5 && (project.remaining_hours || 0) > 0
                      ? 'bg-yellow-50 border-yellow-200'
                      : (project.remaining_hours || 0) === 0
                      ? 'bg-red-50 border-red-200'
                      : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-center justify-center mb-1">
                      <Clock className={`w-4 h-4 mr-1 ${
                        (project.remaining_hours || 0) <= 5 && (project.remaining_hours || 0) > 0
                          ? 'text-yellow-600'
                          : (project.remaining_hours || 0) === 0
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`} />
                      <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Restantes</span>
                    </div>
                    <p className={`text-base font-semibold ${
                      (project.remaining_hours || 0) <= 5 && (project.remaining_hours || 0) > 0
                        ? 'text-yellow-700'
                        : (project.remaining_hours || 0) === 0
                        ? 'text-red-700'
                        : 'text-green-700'
                    }`}>{project.remaining_hours || 0}h</p>
                  </div>
                  <div className={`text-center p-2 rounded border ${
                    (project.entries_count || 0) > 0 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-center mb-1">
                      <FileText className={`w-4 h-4 mr-1 ${
                        (project.entries_count || 0) > 0 
                          ? 'text-blue-600' 
                          : 'text-gray-600'
                      }`} />
                      <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Registros</span>
                    </div>
                    <p className={`text-base font-semibold ${
                      (project.entries_count || 0) > 0 
                        ? 'text-blue-700' 
                        : 'text-gray-900'
                    }`}>{project.entries_count || 0}</p>
                  </div>
                </div>


                {/* Dates */}
                <div className="mt-4 text-xs text-gray-500 flex justify-between">
                  <span>
                    {project.start_date && (
                      <>Inicio: {new Date(project.start_date).toLocaleDateString('es-CO')}</>
                    )}
                  </span>
                  <span>
                    {project.end_date && (
                      <>Fin: {new Date(project.end_date).toLocaleDateString('es-CO')}</>
                    )}
                  </span>
                </div>

                {/* Time Progress Bar */}
                {project.start_date && project.end_date && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    {(() => {
                      const timeProgress = calculateTimeProgress(project.start_date, project.end_date);
                      return (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-700">
                              Progreso de Tiempo
                            </span>
                            <span className={`text-xs font-medium ${
                              timeProgress.isOverdue ? 'text-red-600' : 
                              timeProgress.daysRemaining <= 7 ? 'text-orange-600' : 'text-gray-600'
                            }`}>
                              {timeProgress.isOverdue 
                                ? `Vencido hace ${Math.abs(timeProgress.daysRemaining)} días`
                                : `${timeProgress.daysRemaining} días restantes`
                              }
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                timeProgress.isOverdue ? 'bg-red-500' :
                                timeProgress.percentage >= 80 ? 'bg-orange-500' :
                                'bg-blue-500'
                              }`}
                              style={{ width: `${Math.min(timeProgress.percentage, 100)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-500">
                              {Math.round(timeProgress.percentage)}% completado
                            </span>
                            {timeProgress.percentage >= 80 && !timeProgress.isOverdue && (
                              <span className="text-xs text-orange-600 font-medium">
                                ¡Próximo a vencer!
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 && !loading && (
        <div className="text-center py-12">
          <Folder className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay proyectos</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter || typeFilter 
              ? 'No se encontraron proyectos con los filtros aplicados.' 
              : 'Comienza creando tu primer proyecto.'
            }
          </p>
          {!searchTerm && !statusFilter && !typeFilter && (
            <div className="mt-6">
              <button
                onClick={handleCreateProject}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                CREAR PROYECTO
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        project={selectedProject}
        isEditing={isEditing}
        onProjectSaved={handleProjectSaved}
        clients={clients}
        contracts={contracts}
      />

      <ProjectWizard
        isOpen={isWizardOpen}
        onClose={handleWizardClose}
        project={selectedProject}
        isEditing={isEditing}
        onProjectSaved={handleProjectSavedFromWizard}
        clients={clients}
        contracts={contracts}
      />

      <ProjectDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        project={selectedProject}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setProjectToDelete(null);
        }}
        onConfirm={confirmDeleteProject}
        type="danger"
        title="Eliminar proyecto"
        message={`¿Estás seguro de que deseas eliminar el proyecto "${projectToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </div>
  );
};

export default Projects;