import React, { useState, useEffect } from 'react';
import { contractsApi, timeEntriesApi } from '../services/supabaseApi';
import { Plus, Clock, Calendar, Search, Filter, AlertCircle, FileText, Trash2, Edit2, ChevronDown, ChevronRight } from 'lucide-react';
import TimeEntryModal from './TimeEntryModal';
import TimeEntryWizard from './TimeEntryWizard';
import ConfirmModal from './ConfirmModal';

const TimeEntries = () => {
  const [timeEntries, setTimeEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [activeContracts, setActiveContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [contractFilter, setContractFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [groupedEntries, setGroupedEntries] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [useWizard, setUseWizard] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAndGroupEntries();
  }, [timeEntries, searchTerm, contractFilter, startDate, endDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [entriesResponse, contractsResponse] = await Promise.all([
        timeEntriesApi.getAll(),
        contractsApi.getAll()
      ]);

      setTimeEntries(entriesResponse.data || []);
      
      const activeOnly = (contractsResponse.data || []).filter(contract => contract.status === 'active');
      setActiveContracts(activeOnly);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterAndGroupEntries = () => {
    let filtered = [...timeEntries];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(entry =>
        (entry.description && entry.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (entry.task_category && entry.task_category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (entry.contract_number && entry.contract_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (entry.client_name && entry.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (entry.created_by && entry.created_by.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by contract
    if (contractFilter !== 'all') {
      filtered = filtered.filter(entry => entry.contract_id === parseInt(contractFilter));
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(entry => entry.entry_date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(entry => entry.entry_date <= endDate);
    }

    // Group by client first, then by project within each client
    const grouped = filtered.reduce((groups, entry) => {
      const clientName = entry.client_name || 'Sin cliente';
      const projectName = entry.project_name || `Contrato: ${entry.contract_number}` || 'Soporte y evolutivos';
      
      // Create client group if it doesn't exist
      if (!groups[clientName]) {
        groups[clientName] = {
          name: clientName,
          subtitle: `Cliente`,
          client: clientName,
          projects: {},
          entries: [],
          totalHours: 0,
          isClient: true
        };
      }
      
      // Create project subgroup within client
      if (!groups[clientName].projects[projectName]) {
        groups[clientName].projects[projectName] = {
          name: projectName,
          subtitle: `Proyecto de ${clientName}`,
          client: clientName,
          entries: [],
          totalHours: 0,
          isProject: true
        };
      }
      
      // Add entry to both client and project
      groups[clientName].entries.push(entry);
      groups[clientName].projects[projectName].entries.push(entry);
      groups[clientName].totalHours += parseInt(entry.hours_used) || 0;
      groups[clientName].projects[projectName].totalHours += parseInt(entry.hours_used) || 0;
      
      return groups;
    }, {});

    setFilteredEntries(filtered);
    setGroupedEntries(grouped);
  };

  const toggleGroupExpansion = (groupKey) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const formatHours = (hours) => {
    return `${hours}h`;
  };

  const handleAddTimeEntry = () => {
    setSelectedEntry(null);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEditTimeEntry = (entry) => {
    setSelectedEntry(entry);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDeleteTimeEntry = (entry) => {
    setEntryToDelete(entry);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await timeEntriesApi.delete(entryToDelete.id);
      setTimeEntries(prev => prev.filter(entry => entry.id !== entryToDelete.id));
      setShowDeleteConfirm(false);
      setEntryToDelete(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setContractFilter('all');
    setStartDate('');
    setEndDate('');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Cargando entradas de tiempo...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar datos</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button 
              onClick={loadData}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registro de Tiempo</h1>
          <p className="text-gray-600">Gestiona las entradas de tiempo por proyecto</p>
        </div>
        <button
          onClick={handleAddTimeEntry}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          REGISTRAR TIEMPO
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Filtros</h3>
            {(searchTerm || contractFilter !== 'all' || startDate || endDate) && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Limpiar filtros
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              value={contractFilter}
              onChange={(e) => setContractFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos los contratos</option>
              {activeContracts.map(contract => (
                <option key={contract.id} value={contract.id}>
                  {contract.contract_number} - {contract.client_name}
                </option>
              ))}
            </select>
            
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Fecha inicio"
            />
            
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Fecha fin"
            />
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Mostrando {filteredEntries.length} de {timeEntries.length} entradas
      </div>

      {/* Time Entries */}
      <div className="space-y-4">
        {Object.keys(groupedEntries).length === 0 && !loading && (
          <div className="card">
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Clock className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay entradas de tiempo</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || contractFilter !== 'all' || startDate || endDate
                  ? 'No se encontraron entradas que coincidan con los filtros'
                  : 'Comienza registrando tu primera entrada de tiempo'
                }
              </p>
              <button 
                onClick={handleAddTimeEntry}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                REGISTRAR TIEMPO
              </button>
            </div>
          </div>
        )}

        {Object.entries(groupedEntries).map(([clientKey, client]) => (
          <div key={clientKey} className="bg-white border border-gray-200 rounded-lg shadow-sm">
            {/* CLIENT HEADER */}
            <div 
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleGroupExpansion(clientKey)}
            >
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {expandedGroups.has(clientKey) ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                      <p className="text-sm text-gray-500">Cliente</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center text-gray-600">
                      <FileText className="w-4 h-4 mr-1" />
                      <span className="font-medium">{client.entries.length}</span>
                      <span className="ml-1 text-gray-500">
                        {client.entries.length === 1 ? 'entrada' : 'entradas'}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-1" />
                      <span className="font-medium">{formatHours(client.totalHours)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PROJECTS WITHIN CLIENT */}
            {expandedGroups.has(clientKey) && (
              <div className="border-t border-gray-200 bg-gray-50">
                {Object.entries(client.projects).map(([projectKey, project], index) => {
                  // Array de colores suaves para diferenciar proyectos
                  const projectColors = [
                    'bg-blue-50 hover:bg-blue-100',      // Azul suave
                    'bg-green-50 hover:bg-green-100',    // Verde suave
                    'bg-purple-50 hover:bg-purple-100',  // Púrpura suave
                    'bg-orange-50 hover:bg-orange-100',  // Naranja suave
                    'bg-indigo-50 hover:bg-indigo-100',  // Índigo suave
                    'bg-pink-50 hover:bg-pink-100',      // Rosa suave
                  ];
                  const colorClass = projectColors[index % projectColors.length];
                  
                  return (
                  <div key={projectKey} className={`${index > 0 ? 'border-t border-gray-100' : ''}`}>
                    {/* PROJECT HEADER */}
                    <div 
                      className={`cursor-pointer transition-colors ${colorClass}`}
                      onClick={() => toggleGroupExpansion(`${clientKey}-${projectKey}`)}
                    >
                      <div className="px-6 py-4 pl-12">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {expandedGroups.has(`${clientKey}-${projectKey}`) ? (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                            <div>
                              <h4 className="text-base font-medium text-gray-900">{project.name}</h4>
                              <p className="text-xs text-gray-500">Proyecto</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center text-gray-600">
                              <FileText className="w-4 h-4 mr-1" />
                              <span className="font-medium">{project.entries.length}</span>
                            </div>
                            <div className="flex items-center text-gray-600">
                              <Clock className="w-4 h-4 mr-1" />
                              <span className="font-medium">{formatHours(project.totalHours)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PROJECT ENTRIES */}
                    {expandedGroups.has(`${clientKey}-${projectKey}`) && (
                      <div className="pl-12 pr-6 pb-4">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horas</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado por</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {project.entries.map((entry) => (
                                <tr key={entry.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {new Date(entry.entry_date).toLocaleDateString('es-CO')}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      entry.task_category === 'development' ? 'bg-blue-100 text-blue-800' :
                                      entry.task_category === 'support' ? 'bg-green-100 text-green-800' :
                                      entry.task_category === 'meeting' ? 'bg-purple-100 text-purple-800' :
                                      entry.task_category === 'planning' ? 'bg-orange-100 text-orange-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {entry.task_category === 'development' ? 'Desarrollo' :
                                       entry.task_category === 'support' ? 'Soporte' :
                                       entry.task_category === 'meeting' ? 'Reunión' :
                                       entry.task_category === 'planning' ? 'Planeación' :
                                       entry.task_category || 'General'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900">
                                    <div className="max-w-xs truncate" title={entry.description}>
                                      {entry.description || '-'}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <div className="flex items-center">
                                      <Clock className="w-4 h-4 text-gray-400 mr-2" />
                                      {formatHours(entry.hours_used)}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {entry.created_by || '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end space-x-2">
                                      <button
                                        onClick={() => handleEditTimeEntry(entry)}
                                        className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-50 transition-colors"
                                        title="Editar entrada"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteTimeEntry(entry)}
                                        className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                                        title="Eliminar entrada"
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
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modals */}
      {isModalOpen && useWizard && (
        <TimeEntryWizard
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onTimeEntrySaved={loadData}
          selectedEntry={isEditing ? selectedEntry : null}
          isEditing={isEditing}
        />
      )}

      {isModalOpen && !useWizard && (
        <TimeEntryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onTimeEntrySaved={loadData}
          selectedEntry={isEditing ? selectedEntry : null}
          isEditing={isEditing}
        />
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Eliminar entrada de tiempo"
        message="¿Estás seguro de que quieres eliminar esta entrada de tiempo? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        confirmButtonClass="btn-danger"
      />
    </div>
  );
};

export default TimeEntries;