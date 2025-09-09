import { useState, useEffect } from 'react';
import { contractsApi, clientsApi, projectsApi, timeEntriesApi, paymentsApi } from '../services/supabaseApi';
import { Calendar, TrendingUp, DollarSign, Clock, FileText, ChevronDown, ChevronRight, Folder } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { hasPermission, PERMISSIONS, ROLES } from '../utils/roles';
import ProtectedRoute from './ProtectedRoute';

const Reports = () => {
  const { user } = useAuth();
  
  // Set default tab based on user role - clients can only see time reports
  const getDefaultTab = () => {
    if (user?.role === ROLES.CLIENT) return 'time-entries';
    return 'monthly';
  };
  
  const [activeTab, setActiveTab] = useState(getDefaultTab());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Report data
  const [monthlyData, setMonthlyData] = useState([]);
  const [activeContractsData, setActiveContractsData] = useState([]);
  const [activeProjectsData, setActiveProjectsData] = useState([]);
  const [timeEntriesData, setTimeEntriesData] = useState([]);
  
  // Time entries grouping
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [groupedTimeEntries, setGroupedTimeEntries] = useState({});
  
  // Filters
  const [monthlyFilters, setMonthlyFilters] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });
  
  const [timeEntriesFilters, setTimeEntriesFilters] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    client_filter: 'all'
  });
  
  const [availableClients, setAvailableClients] = useState([]);

  useEffect(() => {
    if (activeTab === 'monthly') {
      loadMonthlyData();
    } else if (activeTab === 'active-contracts') {
      loadActiveContractsData();
    } else if (activeTab === 'active-projects') {
      loadActiveProjectsData();
    } else if (activeTab === 'time-entries') {
      loadTimeEntriesData();
    }
  }, [activeTab, monthlyFilters, timeEntriesFilters]);

  useEffect(() => {
    if (activeTab === 'time-entries' && availableClients.length === 0) {
      loadAvailableClients();
    }
  }, [activeTab]);


  const loadMonthlyData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get time entries and payments for the selected month/year
      const [timeEntriesResponse, paymentsResponse] = await Promise.all([
        timeEntriesApi.getAll(),
        paymentsApi.getAll()
      ]);
      
      const allTimeEntries = timeEntriesResponse.data || [];
      const allPayments = paymentsResponse.data || [];
      
      // Filter time entries by month and year
      const filteredEntries = allTimeEntries.filter(entry => {
        const entryDate = new Date(entry.entry_date);
        return entryDate.getFullYear() === monthlyFilters.year &&
               entryDate.getMonth() + 1 === monthlyFilters.month;
      });
      
      // Filter payments by month and year
      const filteredPayments = allPayments.filter(payment => {
        const paymentDate = new Date(payment.payment_date);
        return paymentDate.getFullYear() === monthlyFilters.year &&
               paymentDate.getMonth() + 1 === monthlyFilters.month;
      });
      
      // Group by client and contract
      const clientMap = {};
      
      filteredEntries.forEach(entry => {
        const clientName = entry.client_name || 'Sin cliente';
        const contractNumber = entry.contract_number || 'Sin contrato';
        
        if (!clientMap[clientName]) {
          clientMap[clientName] = {
            client_id: clientName,
            client_name: clientName,
            company: '',
            contracts: {}
          };
        }
        
        if (!clientMap[clientName].contracts[contractNumber]) {
          clientMap[clientName].contracts[contractNumber] = {
            contract_id: contractNumber,
            contract_number: contractNumber,
            hours: 0,
            amount: 0
          };
        }
        
        clientMap[clientName].contracts[contractNumber].hours += parseFloat(entry.hours_used) || 0;
      });
      
      // Add payment amounts to contracts
      filteredPayments.forEach(payment => {
        const contractNumber = payment.contract?.contract_number || 'Sin contrato';
        
        // Try to find the client that has this contract
        for (const client of Object.values(clientMap)) {
          if (client.contracts[contractNumber]) {
            client.contracts[contractNumber].amount += parseFloat(payment.amount) || 0;
            break;
          }
        }
      });
      
      // Convert to array format expected by the UI
      const monthlyDataArray = Object.values(clientMap).map(client => ({
        ...client,
        contracts: Object.values(client.contracts)
      }));
      
      setMonthlyData(monthlyDataArray);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveContractsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const contractsResponse = await contractsApi.getAll();
      const allContracts = contractsResponse.data || [];
      
      // Filter only active contracts
      const activeContracts = allContracts.filter(contract => contract.status === 'active');
      
      setActiveContractsData(activeContracts);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveProjectsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const projectsResponse = await projectsApi.getAll();
      const allProjects = projectsResponse.data || [];
      
      // Filter only active projects
      const activeProjects = allProjects.filter(project => project.status === 'active');
      
      setActiveProjectsData(activeProjects);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeEntriesData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const timeEntriesResponse = await timeEntriesApi.getAll();
      const allTimeEntries = timeEntriesResponse.data || [];
      
      // Filter by date range
      const filteredEntries = allTimeEntries.filter(entry => {
        const entryDate = entry.entry_date;
        return entryDate >= timeEntriesFilters.start_date && 
               entryDate <= timeEntriesFilters.end_date;
      });
      
      // Filter by client if specified
      let finalEntries = filteredEntries;
      if (timeEntriesFilters.client_filter !== 'all') {
        finalEntries = filteredEntries.filter(entry => 
          entry.client_name?.includes(timeEntriesFilters.client_filter)
        );
      }
      
      setTimeEntriesData(finalEntries);
      groupTimeEntries(finalEntries);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableClients = async () => {
    try {
      const clientsResponse = await clientsApi.getAll();
      const clients = clientsResponse.data || [];
      setAvailableClients(clients);
    } catch (err) {
      console.error('Error loading clients:', err);
    }
  };

  const groupTimeEntries = (entries) => {
    // Filter by client if not 'all'
    let filteredEntries = entries;
    if (timeEntriesFilters.client_filter && timeEntriesFilters.client_filter !== 'all') {
      filteredEntries = entries.filter(entry => 
        entry.client_name === timeEntriesFilters.client_filter
      );
    }

    const grouped = filteredEntries.reduce((groups, entry) => {
      // Create unique key combining contract and project to avoid merging different contracts
      const contractPart = entry.contract_number || 'Sin contrato';
      const projectPart = entry.project_name || 'Sin proyecto';
      const key = `${contractPart} - ${projectPart}`;
      
      if (!groups[key]) {
        groups[key] = {
          name: entry.contract_number ? entry.contract_number : entry.project_name || 'Sin asignar',
          client: entry.client_name,
          entries: [],
          totalHours: 0,
          totalAmount: 0
        };
      }
      
      groups[key].entries.push(entry);
      groups[key].totalHours += parseFloat(entry.hours_used) || 0;
      groups[key].totalAmount += parseFloat(entry.amount) || 0;
      
      return groups;
    }, {});

    setGroupedTimeEntries(grouped);
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(amount || 0);
  };

  const formatHours = (hours) => {
    return `${parseFloat(hours || 0).toFixed(1)}h`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  const getMonthName = (monthNumber) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[monthNumber - 1];
  };


  const renderMonthlyReport = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
              <select
                value={monthlyFilters.year}
                onChange={(e) => setMonthlyFilters(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {[2023, 2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
              <select
                value={monthlyFilters.month}
                onChange={(e) => setMonthlyFilters(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>{getMonthName(month)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Report Data */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Reporte de {getMonthName(monthlyFilters.month)} {monthlyFilters.year}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contrato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Horas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarifa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {monthlyData.flatMap((client) => 
                client.contracts.map((contract, contractIndex) => (
                  <tr key={`${client.client_id}-${contract.contract_id}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {client.client_name}
                      {client.company && <div className="text-xs text-gray-500">{client.company}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {contract.contract_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatHours(contract.hours)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      -
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(contract.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {monthlyData.length === 0 && !loading && (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay datos para el período seleccionado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderActiveContractsReport = () => (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Contratos Activos - Estado de Progreso</h2>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            {activeContractsData.map((contract) => {
              const completionPercentage = parseFloat(contract.progress_percentage || 0);
              const getProgressColor = (percentage) => {
                if (percentage >= 90) return 'bg-red-500';
                if (percentage >= 75) return 'bg-yellow-500';
                return 'bg-green-500';
              };

              return (
                <div key={contract.contract_number} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{contract.contract_number}</h3>
                      <p className="text-gray-600">{contract.client_name}</p>
                      <p className="text-sm text-gray-500 mt-1">{contract.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-semibold text-gray-900">{completionPercentage.toFixed(1)}%</span>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">COMPLETADO</p>
                    </div>
                  </div>

                  <div className="mb-4 space-y-3">
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progreso de Horas</span>
                        <span>{formatHours(contract.used_hours)} / {formatHours(contract.total_hours)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(completionPercentage)}`}
                          style={{ width: `${Math.min(completionPercentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Time Progress Bar */}
                    {(() => {
                      const startDate = new Date(contract.start_date);
                      const endDate = contract.end_date ? new Date(contract.end_date) : null;
                      const today = new Date();
                      
                      if (!endDate) return null;
                      
                      const totalDuration = endDate - startDate;
                      const elapsedTime = today - startDate;
                      const timePercentage = Math.max(0, Math.min(100, (elapsedTime / totalDuration) * 100));
                      
                      const getTimeProgressColor = (percentage) => {
                        if (percentage >= 90) return 'bg-purple-500';
                        if (percentage >= 75) return 'bg-blue-500';
                        return 'bg-indigo-500';
                      };

                      const totalMonths = Math.round(totalDuration / (1000 * 60 * 60 * 24 * 30.44));
                      const elapsedMonths = Math.round(elapsedTime / (1000 * 60 * 60 * 24 * 30.44));
                      
                      return (
                        <div>
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Progreso Temporal</span>
                            <span>{Math.max(0, elapsedMonths)} / {totalMonths} meses</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${getTimeProgressColor(timePercentage)}`}
                              style={{ width: `${timePercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">FACTURADO:</span>
                      <p className="font-semibold text-gray-900">{formatCurrency(contract.billed_amount)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">VALOR TOTAL:</span>
                      <p className="font-semibold text-gray-900">{formatCurrency(contract.contract_value)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">INICIO:</span>
                      <p className="font-semibold text-gray-900">{formatDate(contract.start_date)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">TARIFA:</span>
                      <p className="font-semibold text-gray-900">{formatCurrency(contract.hourly_rate)}/h</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {activeContractsData.length === 0 && !loading && (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay contratos activos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderActiveProjectsReport = () => (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Proyectos Activos - Vista Ejecutiva</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeProjectsData.map((project) => {
              const completionPercentage = project.estimated_hours > 0 
                ? (parseFloat(project.used_hours || 0) / parseFloat(project.estimated_hours)) * 100 
                : 0;
              
              const getProgressColor = (percentage) => {
                if (percentage >= 90) return 'bg-red-500';
                if (percentage >= 75) return 'bg-yellow-500';
                return 'bg-green-500';
              };

              const getStatusText = (percentage) => {
                if (percentage >= 90) return { text: 'CRÍTICO', color: 'text-red-700' };
                if (percentage >= 75) return { text: 'EN RIESGO', color: 'text-yellow-700' };
                return { text: 'EN PROGRESO', color: 'text-green-700' };
              };

              const status = getStatusText(completionPercentage);

              return (
                <div key={project.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  {/* Header */}
                  <div className="mb-3">
                    <h3 className="font-semibold text-base text-gray-900 mb-1">{project.name}</h3>
                    <p className="text-sm text-gray-600 font-medium">{project.client_name}</p>
                  </div>

                  {/* Status and Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-xs font-semibold uppercase tracking-wide ${status.color}`}>
                        {status.text}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">{completionPercentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(completionPercentage)}`}
                        style={{ width: `${Math.min(completionPercentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">PRESUPUESTO</span>
                      <p className="font-semibold text-gray-900">{formatCurrency(project.total_amount || 0)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">UTILIZADO</span>
                      <p className="font-semibold text-gray-900">{formatCurrency(project.current_cost || 0)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {activeProjectsData.length === 0 && !loading && (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay proyectos activos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderTimeEntriesReport = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={timeEntriesFilters.start_date}
                onChange={(e) => setTimeEntriesFilters(prev => ({ ...prev, start_date: e.target.value }))}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
              <input
                type="date"
                value={timeEntriesFilters.end_date}
                onChange={(e) => setTimeEntriesFilters(prev => ({ ...prev, end_date: e.target.value }))}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <select
                value={timeEntriesFilters.client_filter}
                onChange={(e) => setTimeEntriesFilters(prev => ({ ...prev, client_filter: e.target.value }))}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Todos los clientes</option>
                {availableClients.map(client => (
                  <option key={client.id} value={client.name || client.company}>
                    {client.name || client.company}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Time Entries Grouped View */}
      <div className="space-y-4">
        {Object.keys(groupedTimeEntries).length === 0 && !loading && (
          <div className="card">
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Clock className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay entradas de tiempo</h3>
              <p className="text-gray-500">
                No se encontraron entradas de tiempo para el período seleccionado
              </p>
            </div>
          </div>
        )}

        {Object.entries(groupedTimeEntries).map(([groupKey, group]) => (
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
                      <p className="text-sm text-gray-500">{group.client}</p>
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
                    <div className="flex items-center text-gray-600">
                      <DollarSign className="w-4 h-4 mr-1" />
                      <span className="font-medium">{formatCurrency(group.totalAmount)}</span>
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
                        Proyecto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descripción
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Horas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuario
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {group.entries.map((entry, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                            {formatDate(entry.entry_date)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {entry.project_name || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-xs truncate" title={entry.description}>
                            {entry.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 text-gray-400 mr-2" />
                            {formatHours(entry.hours_used)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {formatCurrency(entry.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.created_by || '-'}
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

      {/* Summary */}
      {timeEntriesData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-body">
              <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">TOTAL DE HORAS</h3>
              <p className="text-2xl font-semibold text-gray-900">
                {formatHours(timeEntriesData.reduce((sum, entry) => sum + parseFloat(entry.hours_used), 0))}
              </p>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">TOTAL FACTURADO</h3>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(timeEntriesData.reduce((sum, entry) => sum + parseFloat(entry.amount), 0))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Filter tabs based on user permissions
  const allTabs = [
    { id: 'monthly', name: 'Reporte Mensual', icon: Calendar, permission: PERMISSIONS.VIEW_MONTHLY_REPORTS },
    { id: 'active-contracts', name: 'Contratos Activos', icon: TrendingUp, permission: PERMISSIONS.VIEW_CONTRACT_REPORTS },
    { id: 'active-projects', name: 'Proyectos Activos', icon: Folder, permission: PERMISSIONS.VIEW_PROJECT_REPORTS },
    { id: 'time-entries', name: 'Entradas de Tiempo', icon: Clock, permission: PERMISSIONS.VIEW_TIME_REPORTS },
  ];

  const tabs = allTabs.filter(tab => 
    !tab.permission || hasPermission(user?.role, tab.permission)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reportes y Análisis</h1>
          <p className="text-sm text-gray-600 mt-1">Análisis detallado de contratos y rendimiento operativo</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {!loading && (
        <>
          {activeTab === 'monthly' && renderMonthlyReport()}
          {activeTab === 'active-contracts' && renderActiveContractsReport()}
          {activeTab === 'active-projects' && renderActiveProjectsReport()}
          {activeTab === 'time-entries' && renderTimeEntriesReport()}
        </>
      )}
    </div>
  );
};

export default Reports;