import React, { useState, useEffect } from 'react';
import { contractsApi, clientsApi, projectsApi, paymentsApi } from '../services/api';
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
    case 'paid': return 'bg-green-100 text-green-800';
    case 'partial': return 'bg-yellow-100 text-yellow-800';
    case 'pending': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
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
  const [billingItems, setBillingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all'); // contracts or projects
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [rowPayments, setRowPayments] = useState({});
  const [deletingPayment, setDeletingPayment] = useState(null);
  const [error, setError] = useState(null);

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

      const contracts = contractsResponse.data.success ? contractsResponse.data.contracts : [];
      const projects = projectsResponse.data.success ? projectsResponse.data.projects : [];
      const clients = clientsResponse.data.success ? clientsResponse.data.clients : [];
      
      console.log('Raw contracts data:', contracts);
      console.log('Raw projects data:', projects);

      // Transform to billing items
      const billingItems = [];

      // Add contracts
      contracts.forEach(contract => {
        const client = clients.find(c => c.id === contract.client_id);
        const totalContractValue = (parseFloat(contract.total_hours) || 0) * (parseFloat(contract.hourly_rate) || 0);
        const paidAmount = parseFloat(contract.billed_amount) || 0;
        const pendingAmount = Math.max(0, totalContractValue - paidAmount);
        
        console.log(`Contract ${contract.id}: billed_amount=${contract.billed_amount}, paidAmount=${paidAmount}`);
        
        billingItems.push({
          id: `contract-${contract.id}`,
          type: 'contract',
          contractId: contract.id,
          name: contract.contract_number,
          description: contract.description,
          client: client ? client.name : 'Cliente desconocido',
          clientCompany: client ? client.company : null,
          totalValue: totalContractValue,
          paidAmount: paidAmount,
          pendingAmount: pendingAmount,
          paymentPercentage: totalContractValue > 0 ? (paidAmount / totalContractValue) * 100 : 0,
          status: contract.status,
          paymentStatus: getPaymentStatus(paidAmount, totalContractValue),
          startDate: contract.start_date,
          endDate: contract.end_date,
          lastPaymentDate: contract.last_payment_date || null
        });
      });

      // Add independent projects
      projects.filter(p => p.is_independent).forEach(project => {
        // For independent projects, calculate total_amount from hourly_rate * estimated_hours if total_amount is not set
        const totalProjectValue = parseFloat(project.total_amount) || 
          ((parseFloat(project.hourly_rate) || 0) * (parseFloat(project.estimated_hours) || 0));
        const paidAmount = parseFloat(project.paid_amount) || 0;
        const pendingAmount = Math.max(0, totalProjectValue - paidAmount);
        
        console.log(`Project ${project.name}: hourly_rate=${project.hourly_rate}, estimated_hours=${project.estimated_hours}, calculated total=${totalProjectValue}`);
        
        billingItems.push({
          id: `project-${project.id}`,
          type: 'project',
          projectId: project.id,
          name: project.name,
          description: project.description,
          client: project.client_name || 'Cliente independiente',
          clientCompany: null,
          totalValue: totalProjectValue,
          paidAmount: paidAmount,
          pendingAmount: pendingAmount,
          paymentPercentage: totalProjectValue > 0 ? (paidAmount / totalProjectValue) * 100 : 0,
          status: project.status,
          paymentStatus: getPaymentStatus(paidAmount, totalProjectValue),
          startDate: project.start_date,
          endDate: project.end_date,
          lastPaymentDate: project.last_payment_date || null
        });
      });

      console.log('Final billingItems before setState:', billingItems);
      setBillingItems(billingItems);
    } catch (error) {
      console.error('Error loading billing data:', error);
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


  const getPaymentStatusIcon = (status) => {
    switch (status) {
      case 'paid': return CheckCircle;
      case 'partial': return Clock;
      case 'pending': return AlertTriangle;
      default: return Clock;
    }
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
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    
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

  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  const handleRegisterPayment = (item) => {
    console.log('Register payment clicked for item:', item);
    setSelectedItem(item);
    setIsPaymentModalOpen(true);
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
    console.log('Toggle expansion for item:', item);
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
          console.log('Loading payments for:', item.type, item.contractId || item.projectId);
          if (item.type === 'contract') {
            response = await paymentsApi.getByContract(item.contractId);
          } else {
            response = await paymentsApi.getByProject(item.projectId);
          }
          
          console.log('Payments response:', response);
          if (response.data.success) {
            console.log('Found payments:', response.data.payments);
            setRowPayments(prev => ({
              ...prev,
              [itemKey]: response.data.payments
            }));
          }
        } catch (error) {
          console.error('Error loading payments:', error);
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

      if (response.data.success) {
        setRowPayments(prev => ({
          ...prev,
          [itemId]: response.data.payments || []
        }));
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    }
  };

  const handleDeletePayment = async (paymentId, itemId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este pago?')) return;
    
    try {
      setDeletingPayment(paymentId);
      console.log('Deleting payment:', paymentId, 'for item:', itemId);
      
      const response = await paymentsApi.delete(paymentId);
      console.log('Delete response:', response.data);
      
      if (response.data.success) {
        // Remove payment from local state immediately 
        // itemId could be 'contract-1' or 'project-1' format
        setRowPayments(prev => ({
          ...prev,
          [itemId]: (prev[itemId] || []).filter(payment => payment.id !== paymentId)
        }));
        
        // Clear any loading state that might interfere
        setLoading(false);
        
        // Force reload main data to update totals
        console.log('Reloading billing data after deletion...');
        await loadBillingData();
        console.log('Billing data reloaded successfully');
      }
    } catch (err) {
      console.error('Error deleting payment:', err);
      setError('Error al eliminar el pago');
    } finally {
      setDeletingPayment(null);
    }
  };

  const stats = getTotalStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Facturación</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona los pagos y facturación de contratos y proyectos
          </p>
        </div>
        <button 
          onClick={() => selectedItem && setIsPaymentModalOpen(true)}
          className="btn-primary inline-flex items-center"
          disabled={!selectedItem}
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Pago
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Receipt className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total de Elementos</p>
                <p className="text-2xl font-bold text-gray-900">{filteredItems.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Pagado</p>
                <p className="text-2xl font-bold text-gray-900">
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
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pendiente</p>
                <p className="text-2xl font-bold text-gray-900">
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

      {filteredItems.map((item) => (
        <div key={item.id} className="card">
          <div 
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleRowExpansion(item)}
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {expandedRows.has(item.id) ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        item.type === 'contract' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {item.type === 'contract' ? 'Contrato' : 'Proyecto'}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(item.paymentStatus)}`}>
                        {getPaymentStatusText(item.paymentStatus)}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-500">{item.client}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-sm">
                  <div className="text-center">
                    <div className="flex items-center text-gray-600">
                      <DollarSign className="w-4 h-4 mr-1" />
                      <span className="font-medium">Total</span>
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(item.totalValue, true)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center text-gray-600">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      <span className="font-medium">Pagado</span>
                    </div>
                    <div className="text-lg font-semibold text-green-600">
                      {formatCurrency(item.paidAmount, true)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center text-gray-600">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      <span className="font-medium">Pendiente</span>
                    </div>
                    <div className="text-lg font-semibold text-orange-600">
                      {formatCurrency(item.pendingAmount, true)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      {item.paymentPercentage.toFixed(0)}% Pagado
                    </div>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, item.paymentPercentage)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {expandedRows.has(item.id) && (
            <div className="px-6 py-4 bg-gray-50">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-md font-semibold text-gray-900">Historial de Pagos</h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem(item);
                      setIsPaymentModalOpen(true);
                    }}
                    className="btn-primary text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar Pago
                  </button>
                </div>
                
                {!rowPayments[item.id] ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : rowPayments[item.id].length === 0 ? (
                  <div className="text-center py-8">
                    <Receipt className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No se han registrado pagos</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Monto
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tipo
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Descripción
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {rowPayments[item.id].map((payment) => (
                          <tr key={payment.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                                {formatDate(payment.payment_date)}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-green-700">
                              {formatCurrency(payment.amount, true)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                payment.payment_type === 'fixed' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {payment.payment_type === 'fixed' ? 'Fijo' : `${payment.percentage}%`}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">
                              <div className="max-w-xs truncate" title={payment.description}>
                                {payment.description || '-'}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePayment(item.id, payment.id);
                                }}
                                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                                title="Eliminar pago"
                                disabled={deletingPayment === payment.id}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const PaymentModal = ({ isOpen, onClose, item, onPaymentSaved }) => {
  const [formData, setFormData] = useState({
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                  
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Tipo/Nombre
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Cliente
                </th>
                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                  Total
                </th>
                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                  Pagado
                </th>
                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                  Pendiente
                </th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  %
                </th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Estado
                </th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => {
                const StatusIcon = getPaymentStatusIcon(item.paymentStatus);
                return (
                  <React.Fragment key={item.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-2 py-4 text-center">
                        <button
                          onClick={() => toggleRowExpansion(item)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {expandedRows.has(item.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-2 py-4">
                        <div>
                          <div className="flex items-center mb-1">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                              item.type === 'contract' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {item.type === 'contract' ? 'C' : 'P'}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-gray-900 truncate" title={item.name}>{item.name}</div>
                          <div className="text-xs text-gray-500 truncate" title={item.description}>{item.description}</div>
                        </div>
                      </td>
                    <td className="px-2 py-4">
                      <div className="text-sm font-medium text-gray-900 truncate" title={item.client}>{item.client}</div>
                    </td>
                    <td className="px-2 py-4 text-right text-sm font-semibold text-gray-900">
                      {formatCurrency(item.totalValue, true)}
                    </td>
                    <td className="px-2 py-4 text-right text-sm font-semibold text-green-600">
                      {formatCurrency(item.paidAmount, true)}
                    </td>
                    <td className="px-2 py-4 text-right text-sm font-semibold text-red-600">
                      {formatCurrency(item.pendingAmount, true)}
                    </td>
                    <td className="px-2 py-4 text-center">
                      <div className="text-sm font-semibold text-gray-700">
                        {item.paymentPercentage.toFixed(0)}%
                      </div>
                      <div className="w-12 bg-gray-200 rounded-full h-1.5 mx-auto mt-1">
                        <div 
                          className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, item.paymentPercentage)}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-2 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${getPaymentStatusColor(item.paymentStatus)}`} title={getPaymentStatusText(item.paymentStatus)}>
                        <StatusIcon className="w-3 h-3" />
                      </span>
                    </td>
                    <td className="px-2 py-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleViewDetails(item)}
                          className="text-violet-600 hover:text-violet-900 p-1"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRegisterPayment(item)}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Registrar pago"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Row for Payments */}
                  {expandedRows.has(item.id) && (
                    <tr>
                      <td colSpan="9" className="px-6 py-4 bg-gray-50">
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-gray-900 flex items-center">
                            <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                            Historial de Pagos
                          </h4>
                          
                          {!rowPayments[item.id] ? (
                            <div className="flex justify-center py-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                            </div>
                          ) : rowPayments[item.id].length === 0 ? (
                            <p className="text-sm text-gray-500">No se han registrado pagos</p>
                          ) : (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <table className="w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                                      Monto
                                    </th>
                                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                                      Tipo
                                    </th>
                                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Descripción
                                    </th>
                                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                                      Fecha
                                    </th>
                                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                                      
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {rowPayments[item.id].map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50">
                                      <td className="px-2 py-3 text-sm">
                                        <div className="font-semibold text-green-700">
                                          {new Intl.NumberFormat('es-CO', {
                                            style: 'currency', 
                                            currency: 'COP',
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 0
                                          }).format(payment.amount)}
                                        </div>
                                      </td>
                                      <td className="px-2 py-3 text-center">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                          payment.payment_type === 'fixed' 
                                            ? 'bg-blue-100 text-blue-800' 
                                            : 'bg-purple-100 text-purple-800'
                                        }`}>
                                          {payment.payment_type === 'fixed' ? 'Fijo' : `${payment.percentage}%`}
                                        </span>
                                      </td>
                                      <td className="px-2 py-3">
                                        <div className="text-sm text-gray-900 truncate max-w-xs">
                                          {payment.description || '-'}
                                        </div>
                                      </td>
                                      <td className="px-2 py-3">
                                        <div className="text-xs text-gray-900">
                                          {new Date(payment.payment_date).toLocaleDateString('es-CO')}
                                        </div>
                                      </td>
                                      <td className="px-2 py-3 text-center">
                                        <button
                                          onClick={() => handleDeletePayment(payment.id, item.id)}
                                          disabled={deletingPayment === payment.id}
                                          className="text-red-500 hover:text-red-700 disabled:opacity-50 p-1"
                                          title="Eliminar pago"
                                        >
                                          {deletingPayment === payment.id ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                                          ) : (
                                            <Trash2 className="w-4 h-4" />
                                          )}
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <Receipt className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay elementos de facturación</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                  ? 'No se encontraron elementos que coincidan con los filtros.'
                  : 'No hay contratos o proyectos para facturar.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedItem && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          item={selectedItem}
          onPaymentSaved={handlePaymentSaved}
        />
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedItem && (
        <DetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          item={selectedItem}
          deletingPayment={deletingPayment}
          onDeletePayment={handleDeletePayment}
        />
      )}
    </div>
  );
};

// Payment Modal Component
const PaymentModal = ({ isOpen, onClose, item, onPaymentSaved }) => {
  const [formData, setFormData] = useState({
    amount: '',
    paymentType: 'fixed', // 'fixed' or 'percentage'
    percentage: '',
    description: '',
    paymentDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingPayment, setDeletingPayment] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('Payment calculation debug:', {
        paymentType: formData.paymentType,
        percentage: formData.percentage,
        amount: formData.amount,
        itemTotalValue: item.totalValue,
        itemPendingAmount: item.pendingAmount
      });

      const paymentAmount = formData.paymentType === 'percentage' 
        ? (item.totalValue * parseFloat(formData.percentage)) / 100
        : parseFloat(formData.amount);

      console.log('Calculated payment amount:', paymentAmount);

      if (!paymentAmount || paymentAmount <= 0) {
        setError('El monto del pago debe ser mayor a 0. Verifica que el valor total del proyecto/contrato no sea 0.');
        return;
      }

      const paymentData = {
        amount: paymentAmount,
        description: formData.description,
        payment_date: formData.paymentDate,
        payment_type: formData.paymentType,
        percentage: formData.paymentType === 'percentage' ? parseFloat(formData.percentage) : null
      };

      // Call API based on item type
      let response;
      console.log('About to make payment API call:', item.type, paymentData);
      if (item.type === 'contract') {
        console.log('Calling contractsApi.addPayment with ID:', item.contractId);
        response = await contractsApi.addPayment(item.contractId, paymentData);
      } else {
        console.log('Calling projectsApi.addPayment with ID:', item.projectId);
        response = await projectsApi.addPayment(item.projectId, paymentData);
      }
      console.log('Payment API response:', response);

      if (response.data.success) {
        onPaymentSaved();
      } else {
        setError(response.data.message);
      }
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
              <p>Valor Total: {new Intl.NumberFormat('es-CO', {style: 'currency', currency: 'COP'}).format(item.totalValue)}</p>
              <p>Pendiente: {new Intl.NumberFormat('es-CO', {style: 'currency', currency: 'COP'}).format(item.pendingAmount)}</p>
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
                <option value="fixed">Monto Fijo</option>
                <option value="percentage">Porcentaje</option>
              </select>
            </div>

            {formData.paymentType === 'fixed' ? (
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
                  max={item.pendingAmount}
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Porcentaje del Total
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
                {calculatedAmount > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    Equivale a: {new Intl.NumberFormat('es-CO', {style: 'currency', currency: 'COP'}).format(calculatedAmount)}
                  </p>
                )}
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

// Detail Modal Component  
const DetailModal = ({ isOpen, onClose, item, deletingPayment, onDeletePayment }) => {
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  useEffect(() => {
    if (isOpen && item) {
      loadPayments();
    }
  }, [isOpen, item]);

  const loadPayments = async () => {
    setLoadingPayments(true);
    try {
      let response;
      if (item.type === 'contract') {
        response = await paymentsApi.getByContract(item.contractId);
      } else {
        response = await paymentsApi.getByProject(item.projectId);
      }
      
      if (response.data.success) {
        setPayments(response.data.payments);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
      setPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    const itemId = item.id; // Use the full item ID like 'contract-1'
    console.log('DetailModal - Deleting payment:', paymentId, 'for item:', itemId);
    
    try {
      // Remove payment from local state immediately
      setPayments(prev => prev.filter(payment => payment.id !== paymentId));
      
      // Call parent delete function with correct itemId
      await onDeletePayment(paymentId, itemId);
      
      // Reload payments to ensure consistency
      await loadPayments();
    } catch (error) {
      console.error('Error in DetailModal deletePayment:', error);
      // Reload on error to restore correct state
      await loadPayments();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Detalles de Facturación</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {item.type === 'contract' ? 'Contrato' : 'Proyecto'}
              </label>
              <p className="text-lg font-semibold text-gray-900">{item.name}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente
              </label>
              <p className="text-lg text-gray-900">{item.client}</p>
              {item.clientCompany && (
                <p className="text-sm text-gray-500">{item.clientCompany}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <p className="text-gray-900">{item.description}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Información Financiera</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor Total
                </label>
                <p className="text-lg font-semibold text-gray-900">
                  {new Intl.NumberFormat('es-CO', {style: 'currency', currency: 'COP'}).format(item.totalValue)}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pagado
                </label>
                <p className="text-lg font-semibold text-green-600">
                  {new Intl.NumberFormat('es-CO', {style: 'currency', currency: 'COP'}).format(item.paidAmount)}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pendiente
                </label>
                <p className="text-lg font-semibold text-red-600">
                  {new Intl.NumberFormat('es-CO', {style: 'currency', currency: 'COP'}).format(item.pendingAmount)}
                </p>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Progreso de Pago
              </label>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, item.paymentPercentage)}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {item.paymentPercentage.toFixed(1)}% completado
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                ${item.status === 'active' ? 'bg-green-100 text-green-800' : 
                  item.status === 'completed' ? 'bg-blue-100 text-blue-800' : 
                  'bg-red-100 text-red-800'}`}>
                {item.status}
              </span>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado de Pago
              </label>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(item.paymentStatus)}`}>
                {getPaymentStatusText(item.paymentStatus)}
              </span>
            </div>
          </div>

          {(item.startDate || item.endDate) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {item.startDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Inicio
                  </label>
                  <p className="text-gray-900">{new Date(item.startDate).toLocaleDateString('es-CO')}</p>
                </div>
              )}
              
              {item.endDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Finalización
                  </label>
                  <p className="text-gray-900">{new Date(item.endDate).toLocaleDateString('es-CO')}</p>
                </div>
              )}
            </div>
          )}

          {/* Historial de Pagos */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <DollarSign className="w-4 h-4 mr-2 text-green-600" />
              Historial de Pagos ({payments.length})
            </h3>
            
            {loadingPayments ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
              </div>
            ) : payments.length === 0 ? (
              <p className="text-gray-500 text-sm">No se han registrado pagos aún</p>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                        Monto
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                        Tipo
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descripción
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                        Fecha
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-2 py-3 text-sm">
                          <div className="font-semibold text-green-700">
                            {new Intl.NumberFormat('es-CO', {
                              style: 'currency', 
                              currency: 'COP',
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0
                            }).format(payment.amount)}
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                            payment.payment_type === 'fixed' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {payment.payment_type === 'fixed' ? 'Fijo' : `${payment.percentage}%`}
                          </span>
                        </td>
                        <td className="px-2 py-3">
                          <div className="text-sm text-gray-900 truncate max-w-xs" title={payment.description}>
                            {payment.description || '-'}
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <div className="text-xs text-gray-900">
                            {new Date(payment.payment_date).toLocaleDateString('es-CO')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(payment.created_at).toLocaleDateString('es-CO')}
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <button
                            onClick={() => handleDeletePayment(payment.id)}
                            disabled={deletingPayment === payment.id}
                            className="text-red-500 hover:text-red-700 disabled:opacity-50 p-1"
                            title="Eliminar pago"
                          >
                            {deletingPayment === payment.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end p-6 border-t border-gray-200">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default Billing;