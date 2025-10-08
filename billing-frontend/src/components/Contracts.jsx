import { useState, useEffect } from 'react';
import { contractsApi, clientsApi } from '../services/supabaseApi';
import { Plus, Search, Filter, Eye, Edit, MoreVertical, Trash2, AlertCircle, Clock, DollarSign, FileText, Calendar, Grid3X3, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import ContractModal from './ContractModal';
import ConfirmModal from './ConfirmModal';

const Contracts = () => {
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contractToDelete, setContractToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'calendar'
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    loadContracts();
    loadClients();
  }, []);

  useEffect(() => {
    filterContracts();
  }, [contracts, searchTerm, statusFilter, clientFilter]);

  const loadContracts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await contractsApi.getAll();
      setContracts(response.data);
    } catch (err) {
      setError(err.message);
      // Error loading contracts
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await clientsApi.getAll();
      setClients(response.data);
    } catch (err) {
      // Error loading clients
    }
  };

  const filterContracts = () => {
    let filtered = [...contracts];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(contract =>
        contract.contract_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(contract => contract.status === statusFilter);
    }

    // Filter by client
    if (clientFilter !== 'all') {
      filtered = filtered.filter(contract => contract.client_id === parseInt(clientFilter));
    }

    setFilteredContracts(filtered);
  };

  const handleCreateContract = () => {
    setSelectedContract(null);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEditContract = (contract) => {
    setSelectedContract(contract);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleViewContract = (contract) => {
    setSelectedContract(contract);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleContractSaved = () => {
    loadContracts();
    setIsModalOpen(false);
  };

  const handleStatusChange = async (contractId, newStatus) => {
    try {
      const response = await contractsApi.updateStatus(contractId, newStatus);
      if (response.data.success) {
        loadContracts();
      } else {
        alert('Error al actualizar estado: ' + response.data.message);
      }
    } catch (error) {
      alert('Error al actualizar estado: ' + error.message);
    }
  };

  const handleDeleteContract = (contract) => {
    setContractToDelete(contract);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteContract = async () => {
    if (!contractToDelete) return;
    
    try {
      await contractsApi.delete(contractToDelete.id);
      alert('Contrato eliminado exitosamente');
      loadContracts();
      setContractToDelete(null);
    } catch (error) {
      alert('Error al eliminar contrato: ' + error.message);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(amount || 0);
  };

  const formatHours = (hours) => {
    return `${parseFloat(hours || 0).toFixed(1)}h`;
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-gray-50 text-green-800 border border-gray-200';
      case 'completed':
        return 'bg-gray-50 text-blue-800 border border-gray-200';
      case 'cancelled':
        return 'bg-gray-50 text-red-800 border border-gray-200';
      default:
        return 'bg-gray-50 text-gray-800 border border-gray-200';
    }
  };

  const calculateTimeProgress = (startDate, endDate) => {
    if (!startDate || !endDate) return { percentage: 0, isOverdue: false, monthsRemaining: null, monthsElapsed: 0, totalMonths: 0 };

    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Calculate total duration and elapsed time in months
    const totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    const elapsedMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    
    // Calculate percentage (clamped between 0 and 100)
    const percentage = totalMonths > 0 ? Math.max(0, Math.min(100, (elapsedMonths / totalMonths) * 100)) : 0;
    
    // Check if overdue
    const isOverdue = now > end;
    
    // Calculate months remaining
    const monthsRemaining = totalMonths - elapsedMonths;
    
    return { percentage, isOverdue, monthsRemaining, monthsElapsed: elapsedMonths, totalMonths };
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of month and how many days in month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    const days = [];
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: null, date: null, contracts: [] });
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      
      // Find contracts that are ending soon or have already ended
      const dayContracts = filteredContracts.filter(contract => {
        if (!contract.end_date) return false;
        
        const endDate = new Date(contract.end_date);
        
        // Show contracts that:
        // 1. End on this specific day
        // 2. Have already ended (past end date)
        // 3. Are ending within the next 30 days
        const isEndingOnThisDay = endDate.toDateString() === date.toDateString();
        const hasAlreadyEnded = endDate < today && endDate.toDateString() === date.toDateString();
        const isEndingSoon = endDate <= thirtyDaysFromNow && endDate.toDateString() === date.toDateString();
        
        return isEndingOnThisDay || hasAlreadyEnded || isEndingSoon;
      });
      
      days.push({
        day,
        date,
        dateStr,
        contracts: dayContracts,
        isToday: dateStr === new Date().toISOString().split('T')[0]
      });
    }
    
    return days;
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getContractColor = (contract) => {
    switch (contract.status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Contratos</h1>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3X3 className="w-4 h-4 mr-2" />
              Tarjetas
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              Calendario
            </button>
          </div>
          <button 
            onClick={handleCreateContract}
            className="btn-primary inline-flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Contrato
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar contratos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Todos los clientes</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name || client.company}</option>
                ))}
              </select>
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="completed">Completados</option>
                <option value="cancelled">Cancelados</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Content - Cards or Calendar */}
      {viewMode === 'grid' ? (
        /* Contracts Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredContracts.map((contract) => {
            const completionPercentage = (contract.used_hours / contract.total_hours) * 100;
            
            return (
              <div key={contract.id} className="card hover:shadow-lg transition-shadow">
                <div className="card-body">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{contract.client_name}</h3>
                      <p className="text-sm text-gray-500">{contract.contract_number}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(contract.status)}`}>
                        {contract.status}
                      </span>
                      <div className="relative">
                        <button className="p-1 rounded-md hover:bg-gray-50">
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        Horas
                      </span>
                      <div className="text-right">
                        <div className="font-medium">{formatHours(contract.used_hours)} / {formatHours(contract.total_hours)}</div>
                      </div>
                    </div>
                    
                    <div className="progress-bar">
                      <div 
                        className={`progress-fill ${getProgressColor(completionPercentage)}`}
                        style={{ width: `${Math.min(completionPercentage, 100)}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Progreso</span>
                      <span className="font-medium">{completionPercentage.toFixed(1)}%</span>
                    </div>

                    {/* Time Progress */}
                    {contract.start_date && contract.end_date && (
                      <>
                        <div className="border-t border-gray-100 pt-3 mt-3">
                          <div className="flex justify-between items-center text-sm mb-2">
                            <span className="text-gray-500 flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              Tiempo
                            </span>
                            {(() => {
                              const timeProgress = calculateTimeProgress(contract.start_date, contract.end_date);
                              return (
                                <span className={`font-medium text-sm ${
                                  timeProgress.isOverdue ? 'text-red-600' : 
                                  timeProgress.monthsRemaining <= 1 ? 'text-orange-600' : 'text-gray-700'
                                }`}>
                                  {timeProgress.monthsElapsed} / {timeProgress.totalMonths} meses
                                </span>
                              );
                            })()}
                          </div>
                          
                          {(() => {
                            const timeProgress = calculateTimeProgress(contract.start_date, contract.end_date);
                            return (
                              <>
                                <div className="progress-bar">
                                  <div 
                                    className={`progress-fill transition-all duration-300 ${
                                      timeProgress.isOverdue ? 'bg-red-500' :
                                      timeProgress.percentage >= 80 ? 'bg-orange-500' :
                                      'bg-blue-500'
                                    }`}
                                    style={{ width: `${Math.min(timeProgress.percentage, 100)}%` }}
                                  ></div>
                                </div>
                                
                                <div className="flex justify-between items-center text-sm mt-2">
                                  <span className={`text-xs ${
                                    timeProgress.isOverdue ? 'text-red-600' : 
                                    timeProgress.monthsRemaining <= 1 ? 'text-orange-600' : 'text-gray-500'
                                  }`}>
                                    {timeProgress.isOverdue 
                                      ? `Vencido hace ${Math.abs(timeProgress.monthsRemaining)} meses`
                                      : `${timeProgress.monthsRemaining} meses restantes`
                                    }
                                  </span>
                                  <span className="font-medium text-sm">{Math.round(timeProgress.percentage)}%</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleViewContract(contract)}
                      className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors border border-gray-200"
                    >
                      <Eye className="w-4 h-4 inline mr-1" />
                      Ver
                    </button>
                    <button 
                      onClick={() => handleEditContract(contract)}
                      className="flex-1 bg-gray-50 hover:bg-gray-100 text-blue-700 px-3 py-2 rounded-md text-sm font-medium transition-colors border border-gray-200"
                    >
                      <Edit className="w-4 h-4 inline mr-1" />
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDeleteContract(contract)}
                      className="bg-gray-50 hover:bg-gray-100 text-red-700 px-3 py-2 rounded-md text-sm font-medium transition-colors border border-gray-200"
                      title="Eliminar contrato"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Calendar View */
        <div className="card">
          <div className="card-body">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                </h2>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => navigateMonth(-1)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigateMonth(1)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-2 text-sm font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors"
              >
                Hoy
              </button>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 bg-gray-50 rounded-lg">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {generateCalendarDays().map((dayData, index) => (
                <div
                  key={index}
                  className={`min-h-[120px] p-2 border border-gray-100 rounded-lg transition-colors ${
                    dayData.day
                      ? dayData.isToday
                        ? 'bg-violet-50 border-violet-200'
                        : 'bg-white hover:bg-gray-50'
                      : 'bg-gray-25'
                  }`}
                >
                  {dayData.day && (
                    <>
                      {/* Day Number */}
                      <div className={`text-sm font-medium mb-1 ${
                        dayData.isToday 
                          ? 'text-violet-700' 
                          : 'text-gray-900'
                      }`}>
                        {dayData.day}
                      </div>
                      
                      {/* Contracts for this day */}
                      <div className="space-y-1">
                        {dayData.contracts.slice(0, 3).map((contract) => {
                          const endDate = new Date(contract.end_date);
                          const today = new Date();
                          const isEndDate = endDate.toDateString() === dayData.date.toDateString();
                          const hasAlreadyEnded = endDate < today;
                          const daysUntilEnd = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                          
                          // Determine urgency level
                          let urgencyColor = getContractColor(contract);
                          let urgencyIcon = '⏰';
                          
                          if (hasAlreadyEnded) {
                            urgencyColor = 'bg-red-100 text-red-800 border-red-300';
                            urgencyIcon = '🔴';
                          } else if (daysUntilEnd <= 7) {
                            urgencyColor = 'bg-orange-100 text-orange-800 border-orange-300';
                            urgencyIcon = '⚠️';
                          } else if (daysUntilEnd <= 30) {
                            urgencyColor = 'bg-yellow-100 text-yellow-800 border-yellow-300';
                            urgencyIcon = '⏰';
                          }
                          
                          return (
                            <div
                              key={contract.id}
                              className={`p-1 px-2 rounded text-xs font-medium border cursor-pointer hover:shadow-sm transition-all ${urgencyColor}`}
                              onClick={() => handleViewContract(contract)}
                              title={`${contract.client_name} - ${contract.contract_number} ${hasAlreadyEnded ? '(Vencido)' : `(Vence en ${daysUntilEnd} días)`}`}
                            >
                              <div className="truncate">
                                {contract.client_name}
                                <span className="ml-1">{urgencyIcon}</span>
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Show "+X more" if there are more contracts */}
                        {dayData.contracts.length > 3 && (
                          <div className="text-xs text-gray-500 px-2 py-1">
                            +{dayData.contracts.length - 3} más
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="mb-2">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Calendario de Vencimientos</h4>
                <p className="text-xs text-gray-500 mb-3">Solo se muestran contratos próximos a vencer (30 días) o ya vencidos</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <span>🔴</span>
                    <span>Ya vencido</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>⚠️</span>
                    <span>Vence en 7 días</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>⏰</span>
                    <span>Vence en 30 días</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                    <span className="text-gray-600">Vencido</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></div>
                    <span className="text-gray-600">Crítico (≤7 días)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
                    <span className="text-gray-600">Próximo (≤30 días)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {filteredContracts.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <FileText className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay contratos</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || statusFilter !== 'all' || clientFilter !== 'all'
              ? 'No se encontraron contratos que coincidan con los filtros'
              : 'Comienza creando tu primer contrato'
            }
          </p>
          <button 
            onClick={handleCreateContract}
            className="btn-primary inline-flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear Contrato
          </button>
        </div>
      )}

      {/* Contract Modal */}
      <ContractModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contract={selectedContract}
        isEditing={isEditing}
        onContractSaved={handleContractSaved}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setContractToDelete(null);
        }}
        onConfirm={confirmDeleteContract}
        type="danger"
        title="Eliminar contrato"
        message={`¿Estás seguro de que deseas eliminar el contrato "${contractToDelete?.contract_number}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </div>
  );
};

export default Contracts;