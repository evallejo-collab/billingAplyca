import { useState, useEffect } from 'react';
import { contractsApi } from '../services/supabaseApi';
import { AlertCircle, CheckCircle, XCircle, FileText, TrendingUp, Clock, DollarSign } from 'lucide-react';

const Dashboard = () => {
  const [activeContracts, setActiveContracts] = useState([]);
  const [allContracts, setAllContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all contracts
      const contractsResponse = await contractsApi.getAll();
      const allContracts = contractsResponse.data || [];
      
      // Filter active contracts
      const activeContracts = allContracts.filter(contract => contract.status === 'active');
      setActiveContracts(activeContracts);
      setAllContracts(allContracts); // Store all contracts for metrics
    } catch (err) {
      setError(err.message);
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
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
    return 'bg-gray-600';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 text-green-800 border border-green-200';
      case 'completed':
        return 'bg-blue-50 text-blue-800 border border-blue-200';
      case 'cancelled':
        return 'bg-red-50 text-red-800 border border-red-200';
      default:
        return 'bg-gray-50 text-gray-800 border border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'ACTIVO';
      case 'completed': return 'COMPLETADO';
      case 'cancelled': return 'CANCELADO';
      default: return status?.toUpperCase() || 'DESCONOCIDO';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">Error al cargar el dashboard: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Panel de Control</h1>
          <p className="text-sm text-gray-600 mt-1">Resumen ejecutivo de contratos y operaciones</p>
        </div>
        <button 
          onClick={loadDashboardData}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-gray-800 rounded hover:bg-gray-700 transition-colors"
        >
          ACTUALIZAR
        </button>
      </div>


      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="w-8 h-8 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">TOTAL CONTRATOS</p>
                <p className="text-xl font-semibold text-gray-900">{allContracts.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="w-8 h-8 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">CONTRATOS ACTIVOS</p>
                <p className="text-xl font-semibold text-green-700">{activeContracts.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="w-8 h-8 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">HORAS UTILIZADAS</p>
                <p className="text-xl font-semibold text-gray-900">{formatHours(activeContracts.reduce((sum, c) => sum + (parseFloat(c.used_hours) || 0), 0))}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="w-8 h-8 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">VALOR TOTAL</p>
                <p className="text-xl font-semibold text-gray-900">{formatCurrency(allContracts.reduce((sum, c) => sum + (parseFloat(c.contract_value) || 0), 0))}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Contracts */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Contratos Activos
          </h2>
        </div>
        <div className="card-body">
          {activeContracts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay contratos activos</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeContracts.map((contract) => {
                const completionPercentage = (contract.used_hours / contract.total_hours) * 100;
                
                return (
                  <div key={contract.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 text-sm">{contract.contract_number}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(contract.status)}`}>
                        {getStatusIcon(contract.status)}
                        <span className="ml-1">{getStatusText(contract.status)}</span>
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2 font-medium">{contract.client_name}</p>
                    <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed">{contract.description}</p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">HORAS</span>
                        <span className="font-semibold text-gray-900">{formatHours(contract.used_hours)} / {formatHours(contract.total_hours)}</span>
                      </div>
                      
                      <div className="progress-bar">
                        <div 
                          className={`progress-fill ${getProgressColor(completionPercentage)}`}
                          style={{ width: `${Math.min(completionPercentage, 100)}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">PROGRESO</span>
                        <span className="font-semibold text-gray-900">{completionPercentage.toFixed(1)}%</span>
                      </div>
                      
                      {/* Time Progress */}
                      {(() => {
                        const startDate = new Date(contract.start_date);
                        const endDate = contract.end_date ? new Date(contract.end_date) : null;
                        const today = new Date();
                        
                        if (!endDate) return null;
                        
                        const totalDuration = endDate - startDate;
                        const elapsedTime = today - startDate;
                        const timePercentage = Math.max(0, Math.min(100, (elapsedTime / totalDuration) * 100));
                        
                        const getTimeProgressColor = (percentage) => {
                          return 'bg-gray-500';
                        };

                        const totalMonths = Math.round(totalDuration / (1000 * 60 * 60 * 24 * 30.44));
                        const elapsedMonths = Math.round(elapsedTime / (1000 * 60 * 60 * 24 * 30.44));
                        
                        return (
                          <>
                            <div className="progress-bar mt-2">
                              <div 
                                className={`progress-fill ${getTimeProgressColor(timePercentage)}`}
                                style={{ width: `${timePercentage}%` }}
                              ></div>
                            </div>
                            
                            <div className="flex justify-between text-sm">
                              <span className="text-xs text-gray-500 uppercase tracking-wide">TIEMPO</span>
                              <span className="font-semibold text-gray-900">{Math.max(0, elapsedMonths)} / {totalMonths} meses</span>
                            </div>
                          </>
                        );
                      })()}
                      
                      <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">RESTANTES</span>
                        <span className="font-semibold text-gray-900">{formatHours(contract.remaining_hours)}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">TARIFA</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(contract.hourly_rate)}/h</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;