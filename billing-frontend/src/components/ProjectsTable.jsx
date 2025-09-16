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
  Target,
  MoreHorizontal,
  Download,
  Grid3X3,
  List,
  ChevronDown,
  Settings
} from 'lucide-react';
import ProjectModal from './ProjectModal';
import ProjectWizard from './ProjectWizard';
import ProjectDetailsModal from './ProjectDetailsModal';

const ProjectsTable = () => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatRichText = (text) => {
    if (!text) return text;
    
    // Procesar texto enriquecido paso a paso
    let processedText = text;
    
    // 1. Convertir saltos de línea
    processedText = processedText.split('\n').map((line, lineIndex) => (
      <span key={`line-${lineIndex}`}>
        {lineIndex > 0 && <br />}
        {processTextFormatting(line)}
      </span>
    ));
    
    return processedText;
  };
  
  const processTextFormatting = (text) => {
    const parts = [];
    let currentIndex = 0;
    
    // Regex para detectar diferentes formatos (incluye enlaces con formato [texto](url))
    const formatRegex = /(\*\*.*?\*\*)|(\*.*?\*)|(\[.*?\]\(.*?\))|(https?:\/\/[^\s]+)|(^• .*$)/gm;
    let match;
    
    while ((match = formatRegex.exec(text)) !== null) {
      // Agregar texto antes del formato
      if (match.index > currentIndex) {
        parts.push(text.slice(currentIndex, match.index));
      }
      
      const matchedText = match[0];
      
      if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
        // Texto en negritas
        parts.push(
          <strong key={`bold-${match.index}`} className="font-semibold">
            {matchedText.slice(2, -2)}
          </strong>
        );
      } else if (matchedText.startsWith('*') && matchedText.endsWith('*') && !matchedText.startsWith('**')) {
        // Texto en cursiva
        parts.push(
          <em key={`italic-${match.index}`} className="italic">
            {matchedText.slice(1, -1)}
          </em>
        );
      } else if (matchedText.startsWith('[') && matchedText.includes('](')) {
        // Enlaces con formato [texto](url)
        const linkMatch = matchedText.match(/\[(.*?)\]\((.*?)\)/);
        if (linkMatch) {
          const [, linkText, linkUrl] = linkMatch;
          parts.push(
            <a 
              key={`markdown-link-${match.index}`}
              href={linkUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {linkText}
            </a>
          );
        }
      } else if (matchedText.startsWith('http')) {
        // URLs simples
        parts.push(
          <a 
            key={`link-${match.index}`}
            href={matchedText} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {matchedText}
          </a>
        );
      } else if (matchedText.startsWith('• ')) {
        // Elementos de lista
        parts.push(
          <div key={`list-${match.index}`} className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            <span>{matchedText.slice(2)}</span>
          </div>
        );
      }
      
      currentIndex = match.index + matchedText.length;
    }
    
    // Agregar texto restante
    if (currentIndex < text.length) {
      parts.push(text.slice(currentIndex));
    }
    
    return parts.length > 0 ? parts : text;
  };
  
  // Filters and Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  // View options - always table for this component
  const viewMode = 'table';
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  
  // Bulk actions
  const [selectedProjects, setSelectedProjects] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [projectsResponse, clientsResponse, contractsResponse] = await Promise.all([
        projectsApi.getAll(),
        clientsApi.getAll(),
        contractsApi.getAll()
      ]);
      
      
      setProjects(projectsResponse.data);
      setClients(clientsResponse.data);
      setContracts(contractsResponse.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    const statusConfig = {
      active: { 
        label: 'Activo', 
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', 
        icon: CheckCircle,
        color: 'emerald'
      },
      completed: { 
        label: 'Listo para facturar', 
        className: 'bg-blue-50 text-blue-700 border border-blue-200', 
        icon: CheckCircle,
        color: 'blue'
      },
      ready_to_invoice: { 
        label: 'Pendiente facturar', 
        className: 'bg-amber-50 text-amber-700 border border-amber-200', 
        icon: DollarSign,
        color: 'amber'
      },
      invoiced: { 
        label: 'Facturado', 
        className: 'bg-violet-50 text-violet-700 border border-violet-200', 
        icon: CheckCircle,
        color: 'violet'
      },
      on_hold: { 
        label: 'En pausa', 
        className: 'bg-slate-50 text-slate-700 border border-slate-200', 
        icon: Pause,
        color: 'slate'
      },
    };

    return statusConfig[status] || { 
      label: status?.charAt(0).toUpperCase() + status?.slice(1).toLowerCase() || 'Desconocido', 
      className: 'bg-gray-50 text-gray-700 border border-gray-200', 
      icon: Target,
      color: 'gray'
    };
  };

  const getClientName = (project) => {
    if (project.is_independent) {
      return project.client_name || 'Cliente Independiente';
    } else {
      const client = clients.find(c => c.id === project.client_id);
      return client ? (client.name || client.company) : 'Cliente no encontrado';
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleSelectProject = (projectId) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProjects.size === filteredProjects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(filteredProjects.map(p => p.id)));
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = !searchTerm || 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getClientName(project).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = !typeFilter || 
      (typeFilter === 'independent' && project.is_independent) ||
      (typeFilter === 'contract' && !project.is_independent);

    const matchesClient = !clientFilter || 
      (project.client_id == clientFilter || project.client_id === parseInt(clientFilter));


    return matchesSearch && matchesType && matchesClient;
  }).sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    // Special handling for client names
    if (sortBy === 'client_name') {
      aValue = getClientName(a);
      bValue = getClientName(b);
    }
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue?.toLowerCase() || '';
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + itemsPerPage);

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
      await projectsApi.delete(projectToDelete.id);
      loadData();
      setProjectToDelete(null);
    } catch (err) {
      alert(err.message || 'Error al eliminar el proyecto');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando proyectos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Gestión de Proyectos</h1>
          <p className="text-sm text-gray-600 mt-1">
            {filteredProjects.length} de {projects.length} proyectos
          </p>
        </div>
        <button
          onClick={handleCreateProject}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Proyecto
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar proyectos, clientes, descripción..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          {/* Client Filter */}
          <div>
            <select
              value={clientFilter}
              onChange={(e) => {
                setClientFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los clientes</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name || client.company}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="contract">De Contrato</option>
              <option value="independent">Independientes</option>
            </select>
          </div>

          {/* Items per page */}
          <div>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>10 por página</option>
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
              <option value={100}>100 por página</option>
            </select>
          </div>
        </div>

        {/* Active filters */}
        {(searchTerm || typeFilter || clientFilter) && (
          <div className="mt-3 flex items-center space-x-2">
            <span className="text-sm text-gray-500">Filtros activos:</span>
            {searchTerm && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                Búsqueda: {searchTerm}
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
            {clientFilter && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Cliente: {clients.find(c => c.id === parseInt(clientFilter))?.name || 'Cliente'}
                <button
                  onClick={() => setClientFilter('')}
                  className="ml-1 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            )}
            {typeFilter && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                Tipo: {typeFilter}
                <button
                  onClick={() => setTypeFilter('')}
                  className="ml-1 text-purple-600 hover:text-purple-800"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('');
                setClientFilter('');
                setCurrentPage(1);
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Limpiar todos
            </button>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedProjects.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedProjects.size} proyecto{selectedProjects.size !== 1 ? 's' : ''} seleccionado{selectedProjects.size !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center space-x-2">
              <button className="text-sm text-blue-700 hover:text-blue-900">
                Cambiar estado
              </button>
              <button className="text-sm text-blue-700 hover:text-blue-900">
                Exportar
              </button>
              <button 
                onClick={() => setSelectedProjects(new Set())}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Deseleccionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedProjects.size === filteredProjects.length && filteredProjects.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Proyecto
                      {sortBy === 'name' && (
                        <ChevronDown className={`ml-1 w-3 h-3 ${sortOrder === 'desc' ? 'transform rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('client_name')}
                  >
                    <div className="flex items-center">
                      Cliente
                      {sortBy === 'client_name' && (
                        <ChevronDown className={`ml-1 w-3 h-3 ${sortOrder === 'desc' ? 'transform rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Estado
                      {sortBy === 'status' && (
                        <ChevronDown className={`ml-1 w-3 h-3 ${sortOrder === 'desc' ? 'transform rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Horas
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('delivery_date')}
                  >
                    <div className="flex items-center">
                      Entrega
                      {sortBy === 'delivery_date' && (
                        <ChevronDown className={`ml-1 w-3 h-3 ${sortOrder === 'desc' ? 'transform rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedProjects.map((project) => {
                  const statusConfig = getStatusConfig(project.status);
                  const StatusIcon = statusConfig.icon;
                  const isOverdue = project.delivery_date && new Date(project.delivery_date) < new Date() && project.status === 'active';
                  const estimatedHours = parseFloat(project.estimated_hours) || 0;
                  const usedHours = parseFloat(project.used_hours) || 0;
                  const hasOvercost = usedHours > estimatedHours && estimatedHours > 0;

                  return (
                    <tr 
                      key={project.id} 
                      className={`hover:bg-gray-50 ${selectedProjects.has(project.id) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedProjects.has(project.id)}
                          onChange={() => handleSelectProject(project.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`flex-shrink-0 w-2 h-8 rounded-full mr-3 ${
                            project.is_independent ? 'bg-purple-400' : 'bg-blue-400'
                          }`}></div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{project.name}</div>
                            {project.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">{formatRichText(project.description)}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{getClientName(project)}</div>
                        {!project.is_independent && project.contract_number && (
                          <div className="text-sm text-gray-500">Contrato: {project.contract_number}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${
                          project.is_independent ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {project.is_independent ? (
                            <>
                              <Building className="w-3 h-3 mr-1" />
                              Independiente
                            </>
                          ) : (
                            <>
                              <FileText className="w-3 h-3 mr-1" />
                              Contrato
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${statusConfig.className}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </span>
                          {isOverdue && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Atrasado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="space-y-1">
                          <div className="text-sm">
                            {hasOvercost ? (
                              <div className="relative group">
                                <span className="text-red-500 cursor-help">
                                  {usedHours}h / {estimatedHours}h
                                </span>
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                  Sobrecosto: +{(usedHours - estimatedHours).toFixed(1)}h
                                </div>
                              </div>
                            ) : (
                              <>
                                <span className="text-gray-900">{usedHours}h</span>
                                <span className="text-gray-500"> / </span>
                                <span className="text-gray-900">{estimatedHours}h</span>
                              </>
                            )}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div
                              className={`h-1 rounded-full ${
                                hasOvercost ? 'bg-red-500' :
                                (usedHours / estimatedHours) >= 0.8 ? 'bg-orange-500' : 'bg-green-500'
                              }`}
                              style={{ 
                                width: `${Math.min(100, (usedHours / estimatedHours) * 100)}%` 
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {project.delivery_date ? (
                          <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                            {new Date(project.delivery_date).toLocaleDateString('es-CO')}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Sin fecha</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewProject(project)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditProject(project)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-700">
                  <span>
                    Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredProjects.length)} de {filteredProjects.length} resultados
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  
                  {/* Page numbers */}
                  <div className="flex space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      if (pageNum <= totalPages) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1 text-sm border rounded-md ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                      return null;
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {filteredProjects.length === 0 && !loading && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
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
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Proyecto
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        project={selectedProject}
        isEditing={isEditing}
        onProjectSaved={() => {
          loadData();
          setIsModalOpen(false);
        }}
        clients={clients}
        contracts={contracts}
      />

      <ProjectWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        project={selectedProject}
        isEditing={isEditing}
        onProjectSaved={() => {
          loadData();
          setIsWizardOpen(false);
        }}
        clients={clients}
        contracts={contracts}
      />

      <ProjectDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        project={selectedProject}
      />

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

export default ProjectsTable;