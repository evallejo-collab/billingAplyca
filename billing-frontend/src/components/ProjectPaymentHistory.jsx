import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contractsApi, projectsApi, paymentsApi, clientsApi } from '../services/supabaseApi';
import PaymentWizard from './PaymentWizard';
import { 
  ArrowLeft,
  Receipt, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Building,
  FileText
} from 'lucide-react';

const ProjectPaymentHistory = () => {
  const { type, id } = useParams(); // type: 'contract' or 'project', id: project/contract id
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentWizardOpen, setIsPaymentWizardOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState(null);

  useEffect(() => {
    loadProjectData();
  }, [type, id]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      
      let itemData;
      let paymentsData;
      
      if (type === 'contract') {
        const [contractResponse, paymentsResponse, clientsResponse] = await Promise.all([
          contractsApi.getById(id),
          paymentsApi.getByContract(id),
          clientsApi.getAll()
        ]);
        
        const contract = contractResponse.data;
        const clients = clientsResponse.data || [];
        const client = clients.find(c => c.id === contract.client_id);
        
        // Calculate paid amount from actual payments instead of billed_amount
        const payments = paymentsResponse.data || [];
        const paidAmount = payments.reduce((total, payment) => total + (parseFloat(payment.amount) || 0), 0);
        
        const totalContractValue = (parseFloat(contract.total_hours) || 0) * (parseFloat(contract.hourly_rate) || 0);
        const pendingAmount = Math.max(0, totalContractValue - paidAmount);
        
        itemData = {
          id: `contract-${contract.id}`,
          type: 'contract',
          contractId: contract.id,
          name: contract.contract_number,
          description: contract.description,
          client: client ? (client.name || client.company) : 'Cliente desconocido',
          clientCompany: client ? (client.company || client.name) : null,
          totalValue: totalContractValue,
          paidAmount: paidAmount,
          pendingAmount: pendingAmount,
          paymentPercentage: totalContractValue > 0 ? (paidAmount / totalContractValue) * 100 : 0,
          status: contract.status,
          startDate: contract.start_date,
          endDate: contract.end_date,
          totalHours: contract.total_hours,
          hourlyRate: contract.hourly_rate,
          lastPaymentDate: contract.last_payment_date || null
        };
        
        paymentsData = paymentsResponse.data || [];
      } else {
        const [projectResponse, paymentsResponse] = await Promise.all([
          projectsApi.getById(id),
          paymentsApi.getByProject(id)
        ]);
        
        const project = projectResponse.data;
        
        // Calculate paid amount from actual payments instead of paid_amount
        const payments = paymentsResponse.data || [];
        const paidAmount = payments.reduce((total, payment) => total + (parseFloat(payment.amount) || 0), 0);
        
        const totalProjectValue = parseFloat(project.total_amount) || 
          ((parseFloat(project.hourly_rate) || 0) * (parseFloat(project.estimated_hours) || 0));
        const pendingAmount = Math.max(0, totalProjectValue - paidAmount);
        
        itemData = {
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
          startDate: project.start_date,
          endDate: project.end_date,
          estimatedHours: project.estimated_hours,
          hourlyRate: project.hourly_rate,
          isIndependent: project.is_independent,
          lastPaymentDate: project.last_payment_date || null
        };
        
        paymentsData = payments;
      }
      
      setItem(itemData);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Error loading project data:', error);
    } finally {
      setLoading(false);
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

  const getPaymentStatus = (paidAmount, totalValue) => {
    if (totalValue === 0) return 'no_value';
    const percentage = (paidAmount / totalValue) * 100;
    if (percentage >= 100) return 'paid';
    if (percentage > 0) return 'partial';
    return 'pending';
  };

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

  const handlePaymentSaved = async () => {
    // Force refresh of data
    setLoading(true);
    
    // Add a small delay to ensure database has updated and then force reload
    setTimeout(async () => {
      try {
        // Clear any potential cached data by re-fetching
        await loadProjectData();
      } catch (error) {
        console.error('Error refreshing payment data:', error);
      }
    }, 200);
    
    setIsPaymentWizardOpen(false);
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este pago? Esta acción no se puede deshacer.')) return;
    
    try {
      setDeletingPayment(paymentId);
      await paymentsApi.delete(paymentId);
      await loadProjectData();
    } catch (error) {
      console.error('Error deleting payment:', error);
    } finally {
      setDeletingPayment(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Proyecto no encontrado</h3>
        <button 
          onClick={() => navigate('/billing')}
          className="btn-primary"
        >
          Volver a Facturación
        </button>
      </div>
    );
  }

  const paymentStatus = getPaymentStatus(item.paidAmount, item.totalValue);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/billing')}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900">Historial de Pagos</h1>
          <p className="text-sm text-gray-600 mt-1">
            Detalle completo de pagos para este {item.type === 'contract' ? 'contrato' : 'proyecto'}
          </p>
        </div>
        <button
          onClick={() => setIsPaymentWizardOpen(true)}
          className="btn-primary inline-flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Pago
        </button>
      </div>

      {/* Project Details Card */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                {item.type === 'contract' ? (
                  <FileText className="w-6 h-6 text-blue-600" />
                ) : (
                  <Building className="w-6 h-6 text-blue-600" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="inline-flex px-2 py-0.5 text-xs font-medium text-gray-700">
                    {item.type === 'contract' ? 'CONTRATO' : 'PROYECTO'}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPaymentStatusColor(paymentStatus)}`}>
                    {getPaymentStatusText(paymentStatus).toUpperCase()}
                  </span>
                  {item.isIndependent && (
                    <span className="inline-flex px-2 py-0.5 text-xs font-medium text-gray-700">
                      INDEPENDIENTE
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">{item.name}</h2>
                <p className="text-base text-gray-700 mb-2">{item.client}</p>
                {item.description && (
                  <p className="text-sm text-gray-600">{item.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {formatCurrency(item.totalValue, true)}
              </div>
              <div className="text-sm text-gray-600">Valor Total</div>
            </div>
            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <div className="text-2xl font-medium text-gray-900 mb-1">
                {formatCurrency(item.paidAmount, true)}
              </div>
              <div className="text-sm text-gray-600">Pagado</div>
            </div>
            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <div className="text-2xl font-medium text-gray-900 mb-1">
                {formatCurrency(item.pendingAmount, true)}
              </div>
              <div className="text-sm text-gray-600">Pendiente</div>
            </div>
            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <div className="text-2xl font-medium text-gray-900 mb-1">
                {item.paymentPercentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Progreso</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, item.paymentPercentage)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Estado:</span>
                <span className="ml-2 font-medium">{item.status}</span>
              </div>
              {item.startDate && (
                <div>
                  <span className="text-gray-500">Inicio:</span>
                  <span className="ml-2 font-medium">{formatDate(item.startDate)}</span>
                </div>
              )}
              {item.endDate && (
                <div>
                  <span className="text-gray-500">Fin:</span>
                  <span className="ml-2 font-medium">{formatDate(item.endDate)}</span>
                </div>
              )}
              {item.lastPaymentDate && (
                <div>
                  <span className="text-gray-500">Último Pago:</span>
                  <span className="ml-2 font-medium">{formatDate(item.lastPaymentDate)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payments History */}
      <div className="card">
        <div className="card-body">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Historial de Pagos</h3>
          
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No hay pagos registrados</h4>
              <p className="text-gray-500 mb-4">
                Comienza agregando el primer pago para este {item.type === 'contract' ? 'contrato' : 'proyecto'}
              </p>
              <button
                onClick={() => setIsPaymentWizardOpen(true)}
                className="btn-primary inline-flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Primer Pago
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                // Group payments by type
                const groupedPayments = payments.reduce((acc, payment) => {
                  const type = payment.payment_type;
                  if (!acc[type]) {
                    acc[type] = [];
                  }
                  acc[type].push(payment);
                  return acc;
                }, {});

                // Define payment type labels - simplified and professional
                const getPaymentTypeInfo = (type) => {
                  switch (type) {
                    case 'fixed':
                      return { label: 'Pagos Fijos', icon: DollarSign };
                    case 'percentage':
                      return { label: 'Pagos por Porcentaje', icon: DollarSign };
                    case 'recurring_support':
                      return { label: 'Soporte Recurrente', icon: Clock };
                    case 'project_scope':
                      return { label: 'Proyectos de Alcance Fijo', icon: Receipt };
                    case 'support_evolutive':
                      return { label: 'Soporte y Evolutivos', icon: Clock };
                    default:
                      return { label: 'Otros Pagos', icon: DollarSign };
                  }
                };

                return Object.entries(groupedPayments).map(([paymentType, typePayments]) => {
                  const typeInfo = getPaymentTypeInfo(paymentType);
                  const Icon = typeInfo.icon;
                  const totalAmount = typePayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                  
                  return (
                    <div key={paymentType} className="bg-white rounded-lg border border-gray-200">
                      {/* Group Header */}
                      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Icon className="w-4 h-4 text-gray-500" />
                            <h4 className="font-medium text-gray-900">{typeInfo.label}</h4>
                            <span className="text-xs text-gray-500">
                              {typePayments.length} pago{typePayments.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="font-medium text-gray-900">
                            {formatCurrency(totalAmount, true)}
                          </div>
                        </div>
                      </div>

                      {/* Payments List */}
                      <div className="divide-y divide-gray-200">
                        {typePayments.map((payment) => (
                          <div key={payment.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 flex-1">
                                <div className="flex items-center text-sm text-gray-600">
                                  <Calendar className="w-4 h-4 mr-2" />
                                  <span className="font-medium">{formatDate(payment.payment_date)}</span>
                                </div>
                                <div className="text-base font-medium text-gray-900">
                                  {formatCurrency(payment.amount, true)}
                                </div>
                                {payment.payment_type === 'recurring_support' && payment.billing_month && (
                                  <span className="px-2 py-1 border border-gray-200 text-gray-600 rounded text-xs">
                                    {payment.billing_month}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-3">
                                {payment.description && (
                                  <div className="text-sm text-gray-600 max-w-md truncate" title={payment.description}>
                                    {payment.description}
                                  </div>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedPayment(payment);
                                    setIsEditPaymentModalOpen(true);
                                  }}
                                  className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
                                  title="Editar pago"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeletePayment(payment.id)}
                                  className="text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
                                  title="Eliminar pago"
                                  disabled={deletingPayment === payment.id}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Payment Wizard */}
      {isPaymentWizardOpen && (
        <PaymentWizard
          isOpen={isPaymentWizardOpen}
          onClose={() => setIsPaymentWizardOpen(false)}
          item={item}
          onPaymentSaved={handlePaymentSaved}
        />
      )}
      
      {/* Edit Payment Modal */}
      {isEditPaymentModalOpen && selectedPayment && (
        <PaymentWizard
          isOpen={isEditPaymentModalOpen}
          onClose={() => {
            setIsEditPaymentModalOpen(false);
            setSelectedPayment(null);
          }}
          item={item}
          payment={selectedPayment}
          isEditing={true}
          onPaymentSaved={() => {
            handlePaymentSaved();
            setIsEditPaymentModalOpen(false);
            setSelectedPayment(null);
          }}
        />
      )}
    </div>
  );
};

export default ProjectPaymentHistory;