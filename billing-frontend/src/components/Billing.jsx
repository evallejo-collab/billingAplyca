import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { contractsApi, clientsApi, projectsApi, paymentsApi } from '../services/supabaseApi';
import PaymentWizard from './PaymentWizard';
import { 
  Receipt, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Edit,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Trash2
} from 'lucide-react';

// Helper functions for payment status calculations
const getPaymentStatusColor = (status) => {
  switch (status) {
    case 'paid': return 'bg-green-50 text-green-800 border border-green-200';
    case 'partial': return 'bg-yellow-50 text-yellow-800 border border-yellow-200';
    case 'pending': return 'bg-red-50 text-red-800 border border-red-200';
    default: return 'bg-gray-50 text-gray-700 border border-gray-200';
  }
};

const getPaymentStatusText = (status) => {
  switch (status) {
    case 'paid': return 'Pagado';
    case 'partial': return 'Pago Parcial';
    case 'pending': return 'Pendiente';
    default: return 'Sin Valor';
  }
};


const Billing = () => {
  const navigate = useNavigate();
  const [billingItems, setBillingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all'); // contracts or projects
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaymentWizardOpen, setIsPaymentWizardOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [rowPayments, setRowPayments] = useState({});
  const [deletingPayment, setDeletingPayment] = useState(null);
  const [error, setError] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      
      // Load contracts and projects
      const [contractsResponse, projectsResponse, clientsResponse] = await Promise.all([
        contractsApi.getAll(),
        projectsApi.getAll(),
        clientsApi.getAll()
      ]);

      const contracts = contractsResponse.data || [];
      const projects = projectsResponse.data || [];
      const clients = clientsResponse.data || [];
      
      // Create client groups structure
      const clientGroups = {};

      // Process contracts first
      contracts.forEach(contract => {
        const client = clients.find(c => c.id === contract.client_id);
        const clientName = client ? (client.name || client.company) : 'Cliente desconocido';
        const totalContractValue = (parseFloat(contract.total_hours) || 0) * (parseFloat(contract.hourly_rate) || 0);
        const paidAmount = parseFloat(contract.billed_amount) || 0;
        const pendingAmount = Math.max(0, totalContractValue - paidAmount);
        
        if (!clientGroups[clientName]) {
          clientGroups[clientName] = {
            id: `client-${clientName}`,
            type: 'client_group',
            clientName: clientName,
            projects: [],
            totalValue: 0,
            paidAmount: 0,
            pendingAmount: 0
          };
        }

        const contractItem = {
          id: `contract-${contract.id}`,
          type: 'contract',
          contractId: contract.id,
          name: contract.contract_number,
          description: contract.description,
          client: clientName,
          clientCompany: client ? (client.company || client.name) : null,
          totalValue: totalContractValue,
          paidAmount: paidAmount,
          pendingAmount: pendingAmount,
          paymentPercentage: totalContractValue > 0 ? (paidAmount / totalContractValue) * 100 : 0,
          status: contract.status,
          paymentStatus: getPaymentStatus(paidAmount, totalContractValue),
          startDate: contract.start_date,
          endDate: contract.end_date,
          lastPaymentDate: contract.last_payment_date || null
        };

        clientGroups[clientName].projects.push(contractItem);
        clientGroups[clientName].totalValue += totalContractValue;
        clientGroups[clientName].paidAmount += paidAmount;
        clientGroups[clientName].pendingAmount += pendingAmount;
      });


      // Process independent projects - group them under their clients
      projects.filter(p => p.is_independent).forEach(project => {
        const clientName = project.client_name || 'Cliente independiente';
        const totalProjectValue = parseFloat(project.total_amount) || 
          ((parseFloat(project.hourly_rate) || 0) * (parseFloat(project.estimated_hours) || 0));
        const paidAmount = parseFloat(project.paid_amount) || 0;
        const pendingAmount = Math.max(0, totalProjectValue - paidAmount);

        // Create client group if it doesn't exist
        if (!clientGroups[clientName]) {
          clientGroups[clientName] = {
            id: `client-${clientName}`,
            type: 'client_group',
            clientName: clientName,
            projects: [],
            totalValue: 0,
            paidAmount: 0,
            pendingAmount: 0
          };
        }

        const projectItem = {
          id: `project-${project.id}`,
          type: 'project',
          projectId: project.id,
          name: project.name,
          description: project.description,
          client: clientName,
          clientCompany: null,
          totalValue: totalProjectValue,
          paidAmount: paidAmount,
          pendingAmount: pendingAmount,
          paymentPercentage: totalProjectValue > 0 ? (paidAmount / totalProjectValue) * 100 : 0,
          status: project.status,
          paymentStatus: getPaymentStatus(paidAmount, totalProjectValue),
          startDate: project.start_date,
          endDate: project.end_date,
          isIndependent: true,
          lastPaymentDate: project.last_payment_date || null
        };

        clientGroups[clientName].projects.push(projectItem);
        clientGroups[clientName].totalValue += totalProjectValue;
        clientGroups[clientName].paidAmount += paidAmount;
        clientGroups[clientName].pendingAmount += pendingAmount;
      });

      // Calculate payment percentages for client groups
      Object.values(clientGroups).forEach(group => {
        group.paymentPercentage = group.totalValue > 0 ? (group.paidAmount / group.totalValue) * 100 : 0;
        group.paymentStatus = getPaymentStatus(group.paidAmount, group.totalValue);
      });

      // Create final billing structure - just use client groups
      const billingItems = Object.values(clientGroups);

      setBillingItems(billingItems);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatus = (paidAmount, totalValue) => {
    if (totalValue === 0) return 'no_value';
    const percentage = (paidAmount / totalValue) * 100;
    if (percentage >= 100) return 'paid';
    if (percentage > 0) return 'partial';
    return 'pending';
  };

  const formatCurrency = (amount, compact = false) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: compact ? 0 : 2,
      maximumFractionDigits: compact ? 0 : 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  const filteredItems = billingItems.filter(item => {
    // For client groups and independent groups, check both the group and its projects
    if (item.type === 'client_group' || item.type === 'independent_group') {
      const groupMatches = item.clientName.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Check if any project in the group matches
      const projectMatches = item.projects.some(project => 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      
      const matchesSearch = groupMatches || projectMatches;
      
      // For status filter, check if any project matches or the group overall status matches
      const groupStatusMatches = statusFilter === 'all' || item.paymentStatus === statusFilter;
      const projectStatusMatches = item.projects.some(project => 
        statusFilter === 'all' || project.paymentStatus === statusFilter
      );
      const matchesStatus = groupStatusMatches || projectStatusMatches;
      
      // For type filter, check if any project matches
      const projectTypeMatches = item.projects.some(project => 
        typeFilter === 'all' || project.type === typeFilter
      );
      const matchesType = typeFilter === 'all' || projectTypeMatches;

      return matchesSearch && matchesStatus && matchesType;
    }
    
    // This shouldn't happen with the new structure, but keep for safety
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || item.paymentStatus === statusFilter;
    const matchesType = typeFilter === 'all' || item.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getTotalStats = () => {
    const total = filteredItems.reduce((acc, item) => acc + item.totalValue, 0);
    const paid = filteredItems.reduce((acc, item) => acc + item.paidAmount, 0);
    const pending = filteredItems.reduce((acc, item) => acc + item.pendingAmount, 0);
    
    return { total, paid, pending };
  };

  const handlePaymentSaved = async () => {
    await loadBillingData(); // Reload data after payment
    // Reload payment history for expanded items
    const currentExpandedItems = Array.from(expandedRows);
    for (const itemId of currentExpandedItems) {
      await loadPaymentHistory(itemId);
    }
    setIsPaymentModalOpen(false);
    setSelectedItem(null);
  };

  const toggleRowExpansion = async (item) => {
    const itemKey = item.id;
    const newExpandedRows = new Set(expandedRows);
    
    if (expandedRows.has(itemKey)) {
      newExpandedRows.delete(itemKey);
    } else {
      newExpandedRows.add(itemKey);
      // Load payments for this item if not already loaded
      if (!rowPayments[itemKey]) {
        try {
          let response;
          if (item.type === 'contract') {
            response = await paymentsApi.getByContract(item.contractId);
          } else {
            response = await paymentsApi.getByProject(item.projectId);
          }
          
          const payments = response.data || [];
          setRowPayments(prev => ({
            ...prev,
            [itemKey]: payments
          }));
        } catch (error) {
          // Error loading payments
        }
      }
    }
    
    setExpandedRows(newExpandedRows);
  };

  const loadPaymentHistory = async (itemId) => {
    const item = billingItems.find(item => item.id === itemId);
    if (!item) return;

    try {
      let response;
      if (item.type === 'contract') {
        response = await paymentsApi.getByContract(item.contractId);
      } else {
        response = await paymentsApi.getByProject(item.projectId);
      }

      setRowPayments(prev => ({
        ...prev,
        [itemId]: response.data || []
      }));
    } catch (error) {
      // Error loading payments
    }
  };

  const handleDeletePayment = async (paymentId, itemId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este pago? Esta acción no se puede deshacer.')) return;
    
    try {
      setDeletingPayment(paymentId);
      const response = await paymentsApi.delete(paymentId);
      
      // Supabase delete always succeeds if no error is thrown
      {
        // Remove payment from local state immediately 
        // itemId could be 'contract-1' or 'project-1' format
        setRowPayments(prev => ({
          ...prev,
          [itemId]: (prev[itemId] || []).filter(payment => payment.id !== paymentId)
        }));
        
        // Clear any loading state that might interfere
        setLoading(false);
        
        // Force reload main data to update totals
        await loadBillingData();
      }
    } catch (err) {
      setError('Error al eliminar el pago');
    } finally {
      setDeletingPayment(null);
    }
  };

  const stats = getTotalStats();

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
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Facturación</h1>
          <p className="text-sm text-gray-600 mt-1">
            Control de pagos y facturación de contratos y proyectos
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Receipt className="w-8 h-8 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total de Elementos</p>
                <p className="text-xl font-bold text-gray-900">{filteredItems.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Pagado</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(stats.paid, true)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-8 h-8 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pendiente</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(stats.pending, true)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado de Pago</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Todos los estados</option>
                <option value="paid">Pagado</option>
                <option value="partial">Pago Parcial</option>
                <option value="pending">Pendiente</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Todos los tipos</option>
                <option value="contract">Contratos</option>
                <option value="project">Proyectos</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">&nbsp;</label>
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                }}
                className="w-full btn-secondary flex items-center justify-center"
              >
                <Filter className="w-4 h-4 mr-2" />
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Items - Grouped View */}
      {filteredItems.length === 0 && !loading && (
        <div className="card">
          <div className="card-body text-center py-12">
            <div className="text-gray-400 mb-4">
              <Receipt className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay elementos de facturación</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'No se encontraron elementos que coincidan con los filtros'
                : 'Los contratos y proyectos aparecerán aquí'
              }
            </p>
          </div>
        </div>
      )}

      {filteredItems.map((group) => (
        <div key={group.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
          {/* Client Group Header */}
          <div 
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleRowExpansion(group)}
          >
            <div className="px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {expandedRows.has(group.id) ? (
                    <ChevronDown className="w-5 h-5 text-gray-400 mt-1" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400 mt-1" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xs text-gray-500">
                        {group.projects.length} proyecto{group.projects.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{group.clientName}</h3>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ml-6">
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">TOTAL</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(group.totalValue, true)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-green-600 mb-1">PAGADO</div>
                    <div className="text-sm font-medium text-green-600">
                      {formatCurrency(group.paidAmount, true)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-red-600 mb-1">PENDIENTE</div>
                    <div className="text-sm font-medium text-red-600">
                      {formatCurrency(group.pendingAmount, true)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">PROGRESO</div>
                    <div className="text-sm font-semibold text-gray-900 mb-1">
                      {group.paymentPercentage.toFixed(1)}%
                    </div>
                    <div className="w-20 bg-gray-200 rounded-sm h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-sm transition-all duration-300"
                        style={{ width: `${Math.min(100, group.paymentPercentage)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Projects List */}
          {expandedRows.has(group.id) && (
            <div className="border-t border-gray-200 bg-gray-50">
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {group.projects.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 overflow-hidden">
                      {/* Header con gradiente sutil */}
                      <div className="bg-gradient-to-r from-gray-50 to-white p-4 border-b border-gray-100">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className={`w-2 h-2 rounded-full ${item.type === 'contract' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                              <span className="text-xs font-medium text-gray-600">
                                {item.type === 'contract' ? 'Contrato' : 'Proyecto'}
                              </span>
                              {item.isIndependent && (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                  Independiente
                                </span>
                              )}
                            </div>
                            <h6 className="text-base font-semibold text-gray-900 mb-1">{item.name}</h6>
                            {item.description && (
                              <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Body con métricas */}
                      <div className="p-4">
                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Progreso</span>
                            <span className="text-sm font-bold text-gray-900">{item.paymentPercentage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${
                                item.paymentPercentage >= 100 ? 'bg-green-500' :
                                item.paymentPercentage >= 50 ? 'bg-blue-500' :
                                'bg-yellow-500'
                              }`}
                              style={{ width: `${Math.min(100, item.paymentPercentage)}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Métricas en grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="text-center p-2 bg-gray-50 rounded-lg">
                            <div className="text-lg font-bold text-gray-900">
                              {formatCurrency(item.totalValue, true)}
                            </div>
                            <div className="text-xs text-gray-500">Total</div>
                          </div>
                          <div className="text-center p-2 bg-green-50 rounded-lg">
                            <div className="text-lg font-bold text-green-600">
                              {formatCurrency(item.paidAmount, true)}
                            </div>
                            <div className="text-xs text-green-600">Pagado</div>
                          </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/billing/${item.type}/${item.type === 'contract' ? item.contractId : item.projectId}`);
                            }}
                            className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                          >
                            <Eye className="w-4 h-4 mr-1.5" />
                            Ver Historial
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem(item);
                              setIsPaymentWizardOpen(true);
                            }}
                            className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4 mr-1.5" />
                            Agregar Pago
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Payment Wizard */}
      {isPaymentWizardOpen && selectedItem && (
        <PaymentWizard
          isOpen={isPaymentWizardOpen}
          onClose={() => {
            setIsPaymentWizardOpen(false);
            setSelectedItem(null);
          }}
          item={selectedItem}
          onPaymentSaved={handlePaymentSaved}
        />
      )}

      {/* Payment Modal - Keeping for backwards compatibility */}
      {isPaymentModalOpen && selectedItem && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          item={selectedItem}
          onPaymentSaved={handlePaymentSaved}
        />
      )}

      {/* Edit Payment Modal */}
      {isEditPaymentModalOpen && selectedPayment && selectedItem && (
        <EditPaymentModal
          isOpen={isEditPaymentModalOpen}
          onClose={() => {
            setIsEditPaymentModalOpen(false);
            setSelectedPayment(null);
          }}
          payment={selectedPayment}
          item={selectedItem}
          onPaymentSaved={handlePaymentSaved}
        />
      )}
    </div>
  );
};

// Payment Modal Component
const PaymentModal = ({ isOpen, onClose, item, onPaymentSaved }) => {
  const [formData, setFormData] = useState({
    amount: '',
    paymentType: 'recurring_support', // 'fixed', 'percentage', 'recurring_support', 'project_scope'
    percentage: '',
    description: '',
    paymentDate: new Date().toISOString().split('T')[0],
    billingMonth: new Date().toISOString().slice(0, 7), // YYYY-MM format
    billingYear: new Date().getFullYear(),
    selectedProjectId: '',
    projectPaymentType: 'fixed' // 'fixed' or 'percentage' for project scope
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [availableContracts, setAvailableContracts] = useState([]);

  // Load available projects for scope payments when modal opens
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const [projectsResponse, contractsResponse] = await Promise.all([
          projectsApi.getAll(),
          contractsApi.getAll()
        ]);
        let projects = projectsResponse.data || [];
        setAvailableContracts(contractsResponse.data || []);
          
          // Filter projects based on context:
          // 1. If this is a contract payment, show only projects for that contract's client
          // 2. If this is an independent project payment, show only independent projects
          if (item.type === 'contract') {
            // For contracts, filter projects that belong to the same client
            projects = projects.filter(p => 
              !p.is_independent && // Only contract-based projects
              p.contract_id === item.contractId // Same contract
            );
          } else {
            // For independent projects, show only other independent projects
            projects = projects.filter(p => p.is_independent);
          }
          
          setAvailableProjects(projects);
      } catch (error) {
        setAvailableProjects([]);
      }
    };

    if (isOpen) {
      loadProjects();
    }
  }, [isOpen, item]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {

      let paymentAmount;
      let description = formData.description;
      
      // Calculate amount based on payment type
      switch (formData.paymentType) {
        case 'percentage':
          paymentAmount = (item.totalValue * parseFloat(formData.percentage)) / 100;
          break;
        case 'recurring_support':
          paymentAmount = parseFloat(formData.amount);
          description = `Soporte fijo - ${formData.billingMonth}${description ? ` - ${description}` : ''}`;
          break;
        case 'project_scope':
          const selectedProject = availableProjects.find(p => p.id === parseInt(formData.selectedProjectId));
          if (!selectedProject) {
            setError('Debes seleccionar un proyecto para el alcance fijo');
            return;
          }
          
          if (formData.projectPaymentType === 'percentage') {
            // Debug: ver qué campos tiene el proyecto
            
            // Usar la misma lógica para calcular el total
            let projectTotalAmount = parseFloat(selectedProject.total_amount) || 0;
            let hourlyRate = parseFloat(selectedProject.hourly_rate) || 0;
            
            // Si el proyecto está vinculado a un contrato y no tiene tarifa propia, usar la del contrato
            if (hourlyRate === 0 && selectedProject.contract_id && !selectedProject.is_independent) {
              const linkedContract = availableContracts.find(c => c.id === selectedProject.contract_id);
              if (linkedContract && linkedContract.hourly_rate) {
                hourlyRate = parseFloat(linkedContract.hourly_rate);
              }
            }
            
            if (projectTotalAmount === 0 && hourlyRate > 0 && selectedProject.estimated_hours) {
              projectTotalAmount = hourlyRate * parseFloat(selectedProject.estimated_hours);
              
              // Verificar si el cálculo es demasiado grande (límite de PostgreSQL numeric es ~10^131)
              if (projectTotalAmount > 999999999999) { // Limite más conservador
                setError('El valor calculado del proyecto es demasiado grande. Por favor, verifica la tarifa del contrato y las horas estimadas.');
                return;
              }
            }
            
            if (projectTotalAmount <= 0) {
              setError('El proyecto seleccionado no tiene un valor total configurado ni tarifa/horas estimadas. Por favor, usa el tipo "Monto Fijo" o configura la tarifa y horas estimadas del proyecto.');
              return;
            }
            paymentAmount = (projectTotalAmount * parseFloat(formData.percentage)) / 100;
            
            // Validar que el monto final no sea demasiado grande
            if (paymentAmount > 999999999999) {
              setError('El monto del pago calculado es demasiado grande. Por favor, usa un porcentaje menor o el tipo "Monto Fijo".');
              return;
            }
            
            description = `Proyecto de alcance fijo - ${selectedProject.name} (${formData.percentage}%)${description ? ` - ${description}` : ''}`;
          } else {
            paymentAmount = parseFloat(formData.amount);
            description = `Proyecto de alcance fijo - ${selectedProject.name}${description ? ` - ${description}` : ''}`;
          }
          break;
        case 'support_evolutive':
          paymentAmount = parseFloat(formData.amount);
          description = `Soporte y evolutivos${description ? ` - ${description}` : ''}`;
          break;
        default: // 'fixed'
          paymentAmount = parseFloat(formData.amount);
          break;
      }


      if (!paymentAmount || paymentAmount <= 0) {
        setError('El monto del pago debe ser mayor a 0. Verifica que el valor total del proyecto/contrato no sea 0.');
        return;
      }
      
      // Additional validation for numeric overflow
      if (paymentAmount > 999999999999 || !isFinite(paymentAmount)) {
        setError(`El monto calculado (${paymentAmount}) es demasiado grande o inválido. Por favor verifica los valores del proyecto.`);
        return;
      }

      const paymentData = {
        amount: Math.round(paymentAmount * 100) / 100, // Round to 2 decimal places
        description: description,
        payment_date: formData.paymentDate,
        payment_type: formData.paymentType,
        billing_month: formData.paymentType === 'recurring_support' ? formData.billingMonth : null
      };
      
      // Final validation of payment data

      // Call API based on item type
      let response;
      if (item.type === 'contract') {
        response = await contractsApi.addPayment(item.contractId, paymentData);
      } else {
        response = await projectsApi.addPayment(item.projectId, paymentData);
      }

      onPaymentSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculatedAmount = formData.paymentType === 'percentage' && formData.percentage
    ? (item.totalValue * parseFloat(formData.percentage)) / 100
    : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Registrar Pago</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">{item.name}</h3>
            <div className="text-sm text-gray-600">
              <p>Cliente: {item.client}</p>
              <p>Progreso: {item.paymentPercentage.toFixed(0)}% pagado</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Pago
              </label>
              <select
                value={formData.paymentType}
                onChange={(e) => setFormData({...formData, paymentType: e.target.value, amount: '', percentage: ''})}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="recurring_support">Soporte Fijo Mensual</option>
                <option value="project_scope">Proyecto de Alcance Fijo</option>
                <option value="support_evolutive">Soporte y Evolutivos</option>
              </select>
            </div>

            {/* Recurring Support - Monthly Amount + Month Selector */}
            {formData.paymentType === 'recurring_support' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mes de Facturación
                  </label>
                  <input
                    type="month"
                    value={formData.billingMonth}
                    onChange={(e) => setFormData({...formData, billingMonth: e.target.value})}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto Mensual del Soporte
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="0"
                    step="1000"
                    min="0"
                    required
                  />
                </div>
              </div>
            )}

            {/* Project Scope - Project Selector */}
            {formData.paymentType === 'project_scope' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar Proyecto de Alcance Fijo
                  </label>
                  <select
                    value={formData.selectedProjectId}
                    onChange={(e) => setFormData({...formData, selectedProjectId: e.target.value})}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="">Selecciona un proyecto...</option>
                    {availableProjects.map(project => {
                      try {
                        // Calcular total usando total_amount o hourly_rate * estimated_hours
                        let totalAmount = parseFloat(project.total_amount) || 0;
                        if (totalAmount === 0 && project.hourly_rate && project.estimated_hours) {
                          totalAmount = parseFloat(project.hourly_rate) * parseFloat(project.estimated_hours);
                        }
                        
                        const paidAmount = parseFloat(project.paid_amount) || 0;
                        const remainingAmount = Math.max(0, totalAmount - paidAmount);
                        
                        return (
                          <option key={project.id} value={project.id}>
                            {project.name || 'Sin nombre'} - {project.client_name || 'Sin cliente'} 
                            (Restante: {new Intl.NumberFormat('es-CO', {style: 'currency', currency: 'COP'}).format(remainingAmount)})
                          </option>
                        );
                      } catch (error) {
                        // Error rendering project option
                        return (
                          <option key={project.id} value={project.id}>
                            {project.name || 'Proyecto sin nombre'}
                          </option>
                        );
                      }
                    })}
                  </select>
                </div>
                
                {formData.selectedProjectId && availableProjects.find(p => p.id === parseInt(formData.selectedProjectId)) && (
                  <div className="space-y-4">
                    {/* Project Payment Type Selector */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Pago
                      </label>
                      <select
                        value={formData.projectPaymentType}
                        onChange={(e) => setFormData({...formData, projectPaymentType: e.target.value, amount: '', percentage: ''})}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="fixed">Monto Fijo</option>
                        <option value="percentage">Porcentaje del Proyecto</option>
                      </select>
                    </div>

                    {/* Amount or Percentage for Project */}
                    {formData.projectPaymentType === 'fixed' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Monto del Pago
                        </label>
                        <input
                          type="number"
                          value={formData.amount}
                          onChange={(e) => setFormData({...formData, amount: e.target.value})}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="0"
                          step="1000"
                          min="0"
                          max={availableProjects.find(p => p.id === parseInt(formData.selectedProjectId)).total_amount}
                          required
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Porcentaje del Proyecto
                        </label>
                        <input
                          type="number"
                          value={formData.percentage}
                          onChange={(e) => setFormData({...formData, percentage: e.target.value})}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="0"
                          step="0.1"
                          min="0"
                          max="100"
                          required
                        />
                        {formData.percentage && availableProjects.find(p => p.id === parseInt(formData.selectedProjectId)) && parseFloat(formData.percentage) > 0 && (() => {
                          const selectedProject = availableProjects.find(p => p.id === parseInt(formData.selectedProjectId));
                          // Usar la misma lógica para calcular el total
                          let totalAmount = parseFloat(selectedProject.total_amount) || 0;
                          let hourlyRate = parseFloat(selectedProject.hourly_rate) || 0;
                          
                          // Si el proyecto está vinculado a un contrato y no tiene tarifa propia, usar la del contrato
                          if (hourlyRate === 0 && selectedProject.contract_id && !selectedProject.is_independent) {
                            const linkedContract = availableContracts.find(c => c.id === selectedProject.contract_id);
                            if (linkedContract && linkedContract.hourly_rate) {
                              hourlyRate = parseFloat(linkedContract.hourly_rate);
                            }
                          }
                          
                          if (totalAmount === 0 && hourlyRate > 0 && selectedProject.estimated_hours) {
                            totalAmount = hourlyRate * parseFloat(selectedProject.estimated_hours);
                          }
                          
                          // Validar que los números no sean demasiado grandes para mostrar
                          if (totalAmount > 999999999999) {
                            return (
                              <p className="text-sm text-red-600 mt-1">
                                Valor calculado demasiado grande. Verifica la tarifa y horas estimadas.
                              </p>
                            );
                          }
                          
                          const equivalentAmount = (totalAmount * parseFloat(formData.percentage)) / 100;
                          
                          return (
                            <p className="text-sm text-gray-600 mt-1">
                              Equivale a: {new Intl.NumberFormat('es-CO', {style: 'currency', currency: 'COP'}).format(equivalentAmount)}
                            </p>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Support and Evolutive - Simple Amount */}
            {formData.paymentType === 'support_evolutive' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monto del Soporte y Evolutivos
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="0"
                  step="1000"
                  min="0"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha del Pago
              </label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({...formData, paymentDate: e.target.value})}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción (Opcional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                rows="3"
                placeholder="Notas sobre el pago..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Registrando...' : 'Registrar Pago'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Edit Payment Modal Component
const EditPaymentModal = ({ isOpen, onClose, payment, item, onPaymentSaved }) => {
  const [formData, setFormData] = useState({
    amount: '',
    paymentType: 'fixed',
    percentage: '',
    description: '',
    paymentDate: new Date().toISOString().split('T')[0],
    billingMonth: new Date().toISOString().slice(0, 7),
    equivalentHours: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (payment) {
      // Map old payment types to new ones
      let paymentType = payment.payment_type || 'recurring_support';
      if (['fixed', 'percentage'].includes(payment.payment_type)) {
        paymentType = 'recurring_support'; // Default to recurring support for old fixed/percentage payments
      }
      
      setFormData({
        amount: payment.amount?.toString() || '',
        paymentType: paymentType,
        percentage: '',
        description: payment.description || '',
        paymentDate: payment.payment_date || new Date().toISOString().split('T')[0],
        billingMonth: payment.billing_month || new Date().toISOString().slice(0, 7),
        equivalentHours: payment.equivalent_hours?.toString() || ''
      });
    }
  }, [payment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let paymentAmount;
      let description = formData.description;
      
      // Calculate amount based on payment type
      switch (formData.paymentType) {
        case 'recurring_support':
          paymentAmount = parseFloat(formData.amount);
          if (!description.includes('Soporte fijo')) {
            description = `Soporte fijo - ${formData.billingMonth}${description ? ` - ${description}` : ''}`;
          }
          break;
        case 'project_scope':
          paymentAmount = parseFloat(formData.amount);
          if (!description.includes('Proyecto de alcance fijo')) {
            description = `Proyecto de alcance fijo${description ? ` - ${description}` : ''}`;
          }
          break;
        case 'support_evolutive':
          paymentAmount = parseFloat(formData.amount);
          if (!description.includes('Soporte y evolutivos')) {
            description = `Soporte y evolutivos${description ? ` - ${description}` : ''}`;
          }
          break;
        default:
          paymentAmount = parseFloat(formData.amount);
          break;
      }

      if (!paymentAmount || paymentAmount <= 0) {
        setError('El monto del pago debe ser mayor a 0');
        return;
      }

      const paymentData = {
        amount: paymentAmount,
        description: description,
        payment_date: formData.paymentDate,
        payment_type: formData.paymentType,
        billing_month: formData.paymentType === 'recurring_support' ? formData.billingMonth : null,
        equivalent_hours: formData.equivalentHours ? parseFloat(formData.equivalentHours) : null
      };

      const response = await paymentsApi.update(payment.id, paymentData);

      onPaymentSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Editar Pago</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">{item.name}</h3>
            <div className="text-sm text-gray-600">
              <p>Cliente: {item.client}</p>
              <p>Valor Total: {new Intl.NumberFormat('es-CO', {style: 'currency', currency: 'COP'}).format(item.totalValue)}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Pago
              </label>
              <select
                value={formData.paymentType}
                onChange={(e) => setFormData({...formData, paymentType: e.target.value})}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="recurring_support">Soporte Fijo Mensual</option>
                <option value="project_scope">Proyecto de Alcance Fijo</option>
                <option value="support_evolutive">Soporte y Evolutivos</option>
              </select>
            </div>

            {/* Recurring Support - Monthly Amount + Month Selector */}
            {formData.paymentType === 'recurring_support' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mes de Facturación
                  </label>
                  <input
                    type="month"
                    value={formData.billingMonth}
                    onChange={(e) => setFormData({...formData, billingMonth: e.target.value})}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto del Pago
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="0"
                    step="1000"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horas Equivalentes
                    <span className="text-gray-500 text-xs ml-1">(opcional - para descontar del total del contrato)</span>
                  </label>
                  <input
                    type="number"
                    value={formData.equivalentHours}
                    onChange={(e) => setFormData({...formData, equivalentHours: e.target.value})}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="0"
                    step="0.1"
                    min="0"
                  />
                </div>
              </div>
            )}

            {/* Fixed Amount Payment Types */}
            {['project_scope', 'support_evolutive'].includes(formData.paymentType) && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto del Pago
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="0"
                    step="1000"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horas Equivalentes
                    <span className="text-gray-500 text-xs ml-1">(opcional - para descontar del total del contrato)</span>
                  </label>
                  <input
                    type="number"
                    value={formData.equivalentHours}
                    onChange={(e) => setFormData({...formData, equivalentHours: e.target.value})}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="0"
                    step="0.1"
                    min="0"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha del Pago
              </label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({...formData, paymentDate: e.target.value})}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción (Opcional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                rows="3"
                placeholder="Notas sobre el pago..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Billing;