import React, { useState, useEffect } from 'react';
import { timeEntriesApi } from '../services/supabaseApi';
import { Plus, Clock, AlertCircle, Trash2, Edit2 } from 'lucide-react';
import TimeEntryModal from './TimeEntryModal';
import TimeEntryWizard from './TimeEntryWizard';
import ConfirmModal from './ConfirmModal';

const TimeEntries = () => {
  const [timeEntries, setTimeEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clientFilter, setClientFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [useWizard, setUseWizard] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterEntries();
  }, [timeEntries, clientFilter, monthFilter, startDate, endDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const entriesResponse = await timeEntriesApi.getAll();
      setTimeEntries(entriesResponse.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterEntries = () => {
    let filtered = [...timeEntries];

    // Filter by client
    if (clientFilter !== 'all') {
      filtered = filtered.filter(entry => entry.client_name === clientFilter);
    }

    // Filter by month (takes priority over date range if both are set)
    if (monthFilter !== 'all') {
      const [year, month] = monthFilter.split('-');
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.entry_date);
        const entryYear = entryDate.getFullYear();
        const entryMonth = entryDate.getMonth() + 1;
        return entryYear === parseInt(year) && entryMonth === parseInt(month);
      });
    } else {
      // Filter by date range only if no month filter is selected
      if (startDate) {
        filtered = filtered.filter(entry => entry.entry_date >= startDate);
      }
      if (endDate) {
        filtered = filtered.filter(entry => entry.entry_date <= endDate);
      }
    }

    // Sort by date (most recent first)
    filtered.sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date));
    
    setFilteredEntries(filtered);
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

  const getUniqueClients = () => {
    const clients = [...new Set(timeEntries.map(entry => entry.client_name).filter(Boolean))];
    return clients.sort();
  };

  const getAvailableMonths = () => {
    const months = [...new Set(timeEntries.map(entry => {
      const date = new Date(entry.entry_date);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }))];
    return months.sort().reverse(); // Most recent first
  };

  const getMonthLabel = (monthValue) => {
    const [year, month] = monthValue.split('-');
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const clearFilters = () => {
    setClientFilter('all');
    setMonthFilter('all');
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
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Filtros de Tiempo</h3>
                <p className="text-sm text-gray-600">Personaliza tu vista de entradas</p>
              </div>
            </div>
            {(clientFilter !== 'all' || monthFilter !== 'all' || startDate || endDate) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Client Filter */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👥 Cliente
              </label>
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="all">Todos los clientes</option>
                {getUniqueClients().map(client => (
                  <option key={client} value={client}>
                    {client}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Filter */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🗓️ Mes
              </label>
              <select
                value={monthFilter}
                onChange={(e) => {
                  setMonthFilter(e.target.value);
                  if (e.target.value !== 'all') {
                    setStartDate('');
                    setEndDate('');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="all">Todos los meses</option>
                {getAvailableMonths().map(month => (
                  <option key={month} value={month}>
                    {getMonthLabel(month)}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 Fecha inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value) {
                    setMonthFilter('all');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-50 disabled:text-gray-500"
                disabled={monthFilter !== 'all'}
              />
            </div>

            {/* End Date */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 Fecha fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  if (e.target.value) {
                    setMonthFilter('all');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-50 disabled:text-gray-500"
                disabled={monthFilter !== 'all'}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <span className="text-sm font-medium text-blue-700">
              📊 Mostrando {filteredEntries.length} de {timeEntries.length} entradas
            </span>
          </div>
          {filteredEntries.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
              <span className="text-sm font-medium text-green-700">
                ⏱️ Total: {filteredEntries.reduce((sum, entry) => sum + parseInt(entry.hours_used || 0), 0)}h
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Time Entries Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
        {filteredEntries.length === 0 && !loading ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Clock className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay entradas de tiempo</h3>
            <p className="text-gray-500 mb-4">
              {clientFilter !== 'all' || monthFilter !== 'all' || startDate || endDate
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">📅 Fecha</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">👥 Cliente</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">📂 Proyecto</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">🏷️ Tipo</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">📝 Descripción</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">⏱️ Horas</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">👤 Creado por</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">⚙️ Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredEntries.map((entry, index) => (
                  <tr key={entry.id} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                        {new Date(entry.entry_date).toLocaleDateString('es-CO', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mr-3">
                          <span className="text-white text-xs font-bold">
                            {entry.client_name?.charAt(0)?.toUpperCase() || 'C'}
                          </span>
                        </div>
                        <div className="font-medium text-gray-900">{entry.client_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs">
                        <div className="font-medium truncate" title={entry.project_name || entry.contract_number}>
                          {entry.project_name || `Contrato: ${entry.contract_number}` || 'Soporte y evolutivos'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                        entry.task_category === 'development' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        entry.task_category === 'support' ? 'bg-green-100 text-green-800 border border-green-200' :
                        entry.task_category === 'meeting' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                        entry.task_category === 'planning' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                        'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        {entry.task_category === 'development' ? '💻 Desarrollo' :
                         entry.task_category === 'support' ? '🛠️ Soporte' :
                         entry.task_category === 'meeting' ? '👥 Reunión' :
                         entry.task_category === 'planning' ? '📋 Planeación' :
                         '📝 General'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="max-w-xs">
                        <div className="truncate" title={entry.description}>
                          {entry.description || '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                        <Clock className="w-4 h-4 text-blue-500 mr-2" />
                        <span className="font-bold text-blue-700">{formatHours(entry.hours_used)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center mr-2">
                          <span className="text-white text-xs font-bold">
                            {entry.created_by?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        {entry.created_by || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleEditTimeEntry(entry)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar entrada"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTimeEntry(entry)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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