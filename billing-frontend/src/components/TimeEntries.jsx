import React, { useState, useEffect } from 'react';
import { contractsApi, timeEntriesApi } from '../services/supabaseApi';
import { Plus, Clock, Calendar, Search, Filter, AlertCircle, FileText, Trash2, Edit2, ChevronDown, ChevronRight } from 'lucide-react';
import TimeEntryModal from './TimeEntryModal';

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
      
      // Load time entries and active contracts in parallel
      const [entriesResponse, contractsResponse] = await Promise.all([
        timeEntriesApi.getAll(),
        contractsApi.getAll()
      ]);

      setTimeEntries(entriesResponse.data || []);
      
      // Filter only active contracts
      const activeOnly = (contractsResponse.data || []).filter(contract => contract.status === 'active');
      setActiveContracts(activeOnly);
    } catch (err) {
      setError(err.message);
      console.error('Error loading data:', err);
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

    // Group by contract/project
    const grouped = filtered.reduce((groups, entry) => {
      const key = entry.contract_number || entry.project_name || 'Sin asignar';
      if (!groups[key]) {
        // For contracts: show client name as title, contract number as subtitle
        // For projects: show project name as title, client name as subtitle
        const isContract = entry.contract_number;
        groups[key] = {
          name: isContract ? entry.client_name : entry.project_name || 'Sin asignar',
          subtitle: isContract ? `Número de contrato: ${entry.contract_number}` : entry.client_name,
          client: entry.client_name,
          entries: [],
          totalHours: 0
        };
      }
      
      groups[key].entries.push(entry);
      groups[key].totalHours += parseFloat(entry.hours_used) || 0;
      
      return groups;
    }, {});

    setFilteredEntries(filtered);
    setGroupedEntries(grouped);
  };

  const toggleGroupExpansion = (groupKey) => {
    const newExpanded = new Set(expandedGroups);
    if (expandedGroups.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
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

  const handleTimeEntrySaved = () => {
    loadData();
    setIsModalOpen(false);
    setSelectedEntry(null);
    setIsEditing(false);
  };

  const handleDeleteTimeEntry = async (entryId, taskCategory, description) => {
    const displayText = taskCategory || description || 'entrada sin descripción';
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la entrada: "${displayText}"?`)) {
      return;
    }

    try {
      await timeEntriesApi.delete(entryId);
      loadData(); // Reload the data after deletion
    } catch (error) {
      alert('Error al eliminar la entrada: ' + error.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatHours = (hours) => {
    return `${parseFloat(hours || 0).toFixed(2)}h`;
  };

  const getTotalHours = () => {
    return filteredEntries.reduce((total, entry) => total + parseFloat(entry.hours_used), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Registro de Horas</h1>
          <p className="text-sm text-gray-600 mt-1">Gestión y seguimiento del tiempo trabajado en contratos</p>
        </div>
        <button 
          onClick={handleAddTimeEntry}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
        >
          <Plus className="w-3 h-3 mr-1" />
          REGISTRAR HORAS
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total de Entradas</p>
                <p className="text-xl font-semibold text-blue-700">{filteredEntries.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total de Horas</p>
                <p className="text-xl font-semibold text-green-700">{formatHours(getTotalHours())}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar entradas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contrato</label>
              <select
                value={contractFilter}
                onChange={(e) => setContractFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Todos los contratos</option>
                {activeContracts.map(contract => (
                  <option key={contract.id} value={contract.id}>
                    {contract.client_name} - {contract.contract_number}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">&nbsp;</label>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setContractFilter('all');
                  setStartDate('');
                  setEndDate('');
                }}
                className="w-full inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 rounded hover:bg-gray-100 transition-colors border border-gray-200"
              >
                <Filter className="w-4 h-4 mr-2" />
                LIMPIAR
              </button>
            </div>
          </div>
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

      {/* Time Entries Grouped View */}
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
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                REGISTRAR HORAS
              </button>
            </div>
          </div>
        )}

        {Object.entries(groupedEntries).map(([groupKey, group]) => (
          <div key={groupKey} className="card">
            <div 
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleGroupExpansion(groupKey)}
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {expandedGroups.has(groupKey) ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                      {group.subtitle && (
                        <p className="text-sm text-gray-500">{group.subtitle}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center text-gray-600">
                      <FileText className="w-4 h-4 mr-1" />
                      <span className="font-medium">{group.entries.length}</span>
                      <span className="ml-1 text-gray-500">
                        {group.entries.length === 1 ? 'entrada' : 'entradas'}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-1" />
                      <span className="font-medium">{formatHours(group.totalHours)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {expandedGroups.has(groupKey) && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo de Tarea
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Horas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Creado por
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {group.entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                            {formatDate(entry.entry_date)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-xs">
                            {entry.task_category ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {entry.task_category === 'soporte_aplicativo' && 'Soporte Aplicativo'}
                                {entry.task_category === 'desarrollo_frontend' && 'Desarrollo Frontend'}
                                {entry.task_category === 'desarrollo_backend' && 'Desarrollo Backend'}
                                {entry.task_category === 'analisis_requerimientos' && 'Análisis de Requerimientos'}
                                {entry.task_category === 'testing_qa' && 'Testing y QA'}
                                {entry.task_category === 'devops_infraestructura' && 'DevOps e Infraestructura'}
                                {entry.task_category === 'documentacion' && 'Documentación'}
                                {entry.task_category === 'reunion_cliente' && 'Reunión con Cliente'}
                                {entry.task_category === 'capacitacion' && 'Capacitación'}
                                {entry.task_category === 'mantenimiento' && 'Mantenimiento'}
                                {entry.task_category === 'arquitectura_diseno' && 'Arquitectura y Diseño'}
                                {entry.task_category === 'integraciones' && 'Integraciones'}
                                {entry.task_category === 'optimizacion' && 'Optimización'}
                                {entry.task_category === 'configuracion' && 'Configuración'}
                                {entry.task_category === 'otro' && 'Otro'}
                                {!['soporte_aplicativo', 'desarrollo_frontend', 'desarrollo_backend', 'analisis_requerimientos', 'testing_qa', 'devops_infraestructura', 'documentacion', 'reunion_cliente', 'capacitacion', 'mantenimiento', 'arquitectura_diseno', 'integraciones', 'optimizacion', 'configuracion', 'otro'].includes(entry.task_category) && entry.task_category}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">Sin categoría</span>
                            )}
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
                              onClick={() => handleDeleteTimeEntry(entry.id, entry.task_category, entry.description)}
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
            )}
          </div>
        ))}
      </div>

      {/* Time Entry Modal */}
      <TimeEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        activeContracts={activeContracts}
        onTimeEntrySaved={handleTimeEntrySaved}
        selectedEntry={selectedEntry}
        isEditing={isEditing}
      />
    </div>
  );
};

export default TimeEntries;