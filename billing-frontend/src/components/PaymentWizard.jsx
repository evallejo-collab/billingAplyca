import { useState, useEffect } from 'react';
import { contractsApi, projectsApi, paymentsApi } from '../services/supabaseApi';
import { useAuth } from '../context/AuthContext';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  CreditCard,
  FileText, 
  DollarSign,
  Calendar,
  CheckCircle
} from 'lucide-react';

const PaymentWizard = ({ isOpen, onClose, onPaymentSaved, item, payment = null, isEditing = false }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form data - matching original PaymentModal exactly
  const [formData, setFormData] = useState({
    amount: '',
    paymentType: 'recurring_support', // 'fixed', 'percentage', 'recurring_support', 'project_scope'
    percentage: '',
    description: '',
    paymentDate: new Date().toISOString().split('T')[0],
    billingMonth: new Date().toISOString().slice(0, 7), // YYYY-MM format
    billingYear: new Date().getFullYear(),
    selectedProjectId: '',
    projectPaymentType: 'fixed', // 'fixed' or 'percentage' for project scope
    equivalentHours: ''
  });
  
  const [availableProjects, setAvailableProjects] = useState([]);
  const [availableContracts, setAvailableContracts] = useState([]);

  const steps = [
    { number: 1, title: 'Tipo de Pago', icon: FileText },
    { number: 2, title: 'Monto', icon: DollarSign },
    { number: 3, title: 'Detalles', icon: CreditCard },
    { number: 4, title: 'Confirmación', icon: CheckCircle }
  ];

  const resetWizard = () => {
    setCurrentStep(1);
    setFormData({
      amount: '',
      paymentType: 'recurring_support',
      percentage: '',
      description: '',
      paymentDate: new Date().toISOString().split('T')[0],
      billingMonth: new Date().toISOString().slice(0, 7),
      billingYear: new Date().getFullYear(),
      selectedProjectId: '',
      projectPaymentType: 'fixed'
    });
    setError(null);
  };

  // Load available projects - exact copy from original PaymentModal
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const [projectsResponse, contractsResponse] = await Promise.all([
          projectsApi.getAll(),
          contractsApi.getAll()
        ]);
        let projects = projectsResponse.data || [];
        setAvailableContracts(contractsResponse.data || []);
        
        console.log('🔍 PAYMENT WIZARD DEBUG:');
        console.log('  - All projects loaded:', projects.length);
        console.log('  - Item type:', item?.type);
        console.log('  - Projects with is_independent=true:', projects.filter(p => p.is_independent).length);
        console.log('  - All projects:', projects.map(p => ({ name: p.name, is_independent: p.is_independent })));
          
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
          
          console.log('  - Filtered projects for dropdown:', projects.length);
          console.log('  - Filtered projects:', projects.map(p => ({ name: p.name, is_independent: p.is_independent })));
          
          setAvailableProjects(projects);
      } catch (error) {
        setAvailableProjects([]);
      }
    };

    if (isOpen) {
      if (!isEditing) {
        resetWizard();
      }
      loadProjects();
    }
  }, [isOpen, item, isEditing]);
  
  // Separate useEffect for handling payment data loading
  useEffect(() => {
    if (isOpen && isEditing && payment) {
      const newFormData = {
        amount: payment.amount?.toString() || '',
        paymentType: payment.payment_type || 'recurring_support',
        percentage: payment.percentage?.toString() || '',
        description: payment.description || '',
        paymentDate: payment.payment_date ? payment.payment_date.split('T')[0] : new Date().toISOString().split('T')[0],
        billingMonth: payment.billing_month || new Date().toISOString().slice(0, 7),
        billingYear: payment.billing_year || new Date().getFullYear(),
        selectedProjectId: payment.project_id || '',
        projectPaymentType: payment.project_payment_type || 'fixed',
        equivalentHours: payment.equivalent_hours?.toString() || ''
      };
      setFormData(newFormData);
    }
  }, [isOpen, isEditing, payment]);

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  const validateCurrentStep = () => {
    setError(null);
    
    switch (currentStep) {
      case 1:
        if (!formData.paymentType) {
          setError('Por favor selecciona un tipo de pago');
          return false;
        }
        return true;
      case 2:
        if (formData.paymentType === 'project_scope') {
          if (!formData.selectedProjectId) {
            setError('Por favor selecciona un proyecto');
            return false;
          }
          if (formData.projectPaymentType === 'percentage') {
            if (!formData.percentage || parseFloat(formData.percentage) <= 0 || parseFloat(formData.percentage) > 100) {
              setError('Por favor ingresa un porcentaje válido entre 1 y 100');
              return false;
            }
          } else {
            if (!formData.amount || parseFloat(formData.amount) <= 0) {
              setError('Por favor ingresa un monto válido');
              return false;
            }
          }
        } else {
          // Para recurring_support y support_evolutive
          if (!formData.amount || parseFloat(formData.amount) <= 0) {
            setError('Por favor ingresa un monto válido');
            return false;
          }
        }
        return true;
      case 3:
        if (!formData.paymentDate) {
          setError('Por favor selecciona una fecha de pago');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setLoading(true);
    setError(null);

    try {

      let paymentAmount;
      let description = formData.description;
      
      // Calculate amount based on payment type - EXACT copy from original
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
              
              // Validar inputs antes del cálculo
              const estimatedHours = parseFloat(selectedProject.estimated_hours);
              if (!isFinite(hourlyRate) || !isFinite(estimatedHours)) {
                setError('Los valores de tarifa o horas estimadas no son válidos.');
                return;
              }
              
              if (hourlyRate > 1000000 || estimatedHours > 100000) {
                setError(`Los valores son demasiado grandes: Tarifa=${hourlyRate}, Horas=${estimatedHours}. Por favor verifica los datos.`);
                return;
              }
              
              projectTotalAmount = hourlyRate * estimatedHours;
              
              // Verificar si el cálculo es demasiado grande
              if (projectTotalAmount > 999999999999 || !isFinite(projectTotalAmount)) {
                setError(`El valor calculado del proyecto (${projectTotalAmount}) es demasiado grande. Tarifa: ${hourlyRate}, Horas: ${estimatedHours}`);
                return;
              }
            }
            
            if (projectTotalAmount <= 0) {
              setError('El proyecto seleccionado no tiene un valor total configurado ni tarifa/horas estimadas. Por favor, usa el tipo "Monto Fijo" o configura la tarifa y horas estimadas del proyecto.');
              return;
            }
            
            // Validar porcentaje antes del cálculo final
            const percentage = parseFloat(formData.percentage);
            if (!isFinite(percentage) || percentage <= 0 || percentage > 100) {
              setError('El porcentaje debe ser un número válido entre 1 y 100.');
              return;
            }
            
            paymentAmount = (projectTotalAmount * percentage) / 100;
            
            // Validar que el monto final no sea demasiado grande
            if (paymentAmount > 999999999999 || !isFinite(paymentAmount)) {
              setError(`El monto del pago calculado (${paymentAmount}) es demasiado grande. Total proyecto: ${projectTotalAmount}, Porcentaje: ${percentage}%`);
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

      // Limitar el monto a un valor seguro para PostgreSQL numeric
      const safeAmount = Math.min(Math.round(paymentAmount * 100) / 100, 999999999999);
      
      const paymentData = {
        amount: safeAmount,
        description: description,
        payment_date: formData.paymentDate,
        payment_type: formData.paymentType,
        equivalent_hours: formData.equivalentHours ? parseFloat(formData.equivalentHours) : null
      };
      
      // Solo agregar billing_month si es realmente necesario
      if (formData.paymentType === 'recurring_support' && formData.billingMonth) {
        paymentData.billing_month = formData.billingMonth;
      }
      
      // Debug: Check if contract_id is being added somewhere
      console.log('PaymentWizard - Item type:', item.type);
      console.log('PaymentWizard - Item data:', item);
      console.log('PaymentWizard - Payment data before API call:', paymentData);
      
      // Final validation of payment data
      
      // Validación adicional del formato
      if (typeof paymentData.amount !== 'number' || !isFinite(paymentData.amount)) {
        setError(`Error en el formato del monto: ${typeof paymentData.amount} = ${paymentData.amount}`);
        return;
      }

      // Call API based on item type
      let response;
      
      if (isEditing && payment) {
        // Update existing payment
        response = await paymentsApi.update(payment.id, paymentData);
      } else {
        // Create new payment
        if (item.type === 'contract') {
          response = await contractsApi.addPayment(item.contractId, paymentData);
        } else {
          response = await projectsApi.addPayment(item.projectId, paymentData);
        }
      }

      onPaymentSaved();
      handleClose();
    } catch (err) {
      
      // Mostrar error más detallado
      let errorMessage = err.message;
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.status === 400) {
        errorMessage = `Error 400: Datos inválidos. Monto: ${paymentData.amount}, Tipo: ${paymentData.payment_type}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Tipo de Pago</h3>
              <p className="text-sm text-gray-600">
                Selecciona el tipo de pago que deseas registrar
              </p>
            </div>

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
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Configuración del Pago</h3>
              <p className="text-sm text-gray-600">
                Configura los detalles según el tipo de pago seleccionado
              </p>
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

            {/* Support Evolutive - Simple Amount */}
            {formData.paymentType === 'support_evolutive' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monto del Servicio
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

          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Detalles del Pago</h3>
              <p className="text-sm text-gray-600">
                Información adicional sobre el pago
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Pago
                </label>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({...formData, paymentDate: e.target.value})}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción Adicional (Opcional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Notas adicionales sobre el pago..."
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar Pago</h3>
              <p className="text-sm text-gray-600">
                Revisa los datos antes de registrar el pago
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Tipo de Pago:</span>
                <span className="text-sm text-gray-900">
                  {formData.paymentType === 'fixed' && 'Pago Fijo'}
                  {formData.paymentType === 'project_scope' && 'Proyecto de Alcance Fijo'}
                  {formData.paymentType === 'support_evolutive' && 'Soporte y Evolutivos'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Monto:</span>
                <span className="text-sm text-gray-900">
                  {formData.paymentType === 'project_scope' && formData.projectPaymentType === 'percentage' 
                    ? `${formData.percentage}% del total`
                    : `$${parseInt(formData.amount || 0).toLocaleString('es-CO')}`
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Fecha:</span>
                <span className="text-sm text-gray-900">
                  {new Date(formData.paymentDate).toLocaleDateString('es-ES')}
                </span>
              </div>
              {formData.description && (
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-gray-600">Descripción:</span>
                  <span className="text-sm text-gray-900 text-right max-w-xs">{formData.description}</span>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Editar Pago' : 'Registrar Pago'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {item?.type === 'contract' ? `Contrato: ${item?.name}` : `Proyecto: ${item?.name}`}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Steps Indicator */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <div key={step.number} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors
                    ${isActive ? 'border-blue-600 bg-blue-600 text-white' : 
                      isCompleted ? 'border-green-600 bg-green-600 text-white' : 
                      'border-gray-300 bg-white text-gray-400'}
                  `}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    isActive ? 'text-blue-600' : 
                    isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </span>
                  {index < steps.length - 1 && (
                    <div className={`ml-4 w-8 h-0.5 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: '60vh' }}>
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </button>

          {currentStep < steps.length ? (
            <button
              onClick={handleNext}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors"
            >
              Siguiente
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Registrando...' : 'Registrar Pago'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentWizard;