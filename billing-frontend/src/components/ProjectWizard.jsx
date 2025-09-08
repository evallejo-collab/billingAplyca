import { useState, useEffect } from 'react';
import { projectsApi, clientsApi } from '../services/supabaseApi';
import { 
  X, 
  Save, 
  Folder, 
  User, 
  Building, 
  FileText, 
  Clock, 
  DollarSign, 
  Calendar, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react';

const ProjectWizard = ({ isOpen, onClose, project, isEditing, onProjectSaved, clients, contracts }) => {
  // Exact same form data structure as ProjectModal
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    estimated_hours: '',
    start_date: '',
    end_date: '',
    delivery_date: '',
    status: 'active',
    project_type: 'contract', // 'contract' or 'independent'
    contract_id: '',
    client_id: '',
    // Independent project fields
    independent_client_id: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    hourly_rate: '',
    total_amount: '',
    is_paid: false,
    // Purchase order
    purchase_order_number: '',
    notes: '',
  });
  
  const [availableClients, setAvailableClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    { number: 1, title: 'Tipo de Proyecto', icon: Building },
    { number: 2, title: 'Información Básica', icon: Folder },
    { number: 3, title: 'Cliente y Detalles', icon: User },
    { number: 4, title: 'Configuración Final', icon: Check }
  ];

  // Exact same useEffect logic as ProjectModal
  useEffect(() => {
    if (isOpen) {
      if (isEditing && project) {
        setFormData({
          name: project.name || '',
          description: project.description || '',
          estimated_hours: project.estimated_hours || '',
          start_date: project.start_date || '',
          end_date: project.end_date || '',
          delivery_date: project.delivery_date || '',
          status: project.status || 'active',
          project_type: project.is_independent ? 'independent' : 'contract',
          contract_id: project.contract_id || '',
          client_id: project.client_id || '',
          independent_client_id: project.independent_client_id || '',
          client_name: project.client_name || '',
          client_email: project.client_email || '',
          client_phone: project.client_phone || '',
          hourly_rate: project.hourly_rate || '',
          total_amount: project.total_amount || '',
          is_paid: project.is_paid || false,
          purchase_order_number: project.purchase_order_number || '',
          notes: project.notes || '',
        });
      } else {
        resetForm();
      }
      setError(null);
      setCurrentStep(1);
      loadAvailableClients();
    }
  }, [isOpen, isEditing, project]);

  // Exact same functions as ProjectModal
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      estimated_hours: '',
      start_date: '',
      end_date: '',
      delivery_date: '',
      status: 'active',
      project_type: 'contract',
      contract_id: '',
      client_id: '',
      independent_client_id: '',
      client_name: '',
      client_email: '',
      client_phone: '',
      hourly_rate: '',
      total_amount: '',
      is_paid: false,
      purchase_order_number: '',
      notes: '',
    });
  };

  const loadAvailableClients = async () => {
    try {
      setAvailableClients(clients || []);
    } catch (error) {
      console.error('Error loading available clients:', error);
    }
  };

  // Exact same input change logic as ProjectModal
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // If selecting an independent client, auto-fill client data
    if (name === 'independent_client_id' && value) {
      const selectedClient = availableClients.find(c => c.id === parseInt(value));
      if (selectedClient) {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          client_name: selectedClient.name,
          client_email: selectedClient.email || '',
          client_phone: selectedClient.phone || ''
        }));
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Exact same project type change logic as ProjectModal
  const handleProjectTypeChange = (e) => {
    const newType = e.target.value;
    setFormData(prev => ({
      ...prev,
      project_type: newType,
      // Reset type-specific fields
      contract_id: '',
      client_id: '',
      independent_client_id: '',
      client_name: '',
      client_email: '',
      client_phone: '',
      hourly_rate: newType === 'contract' ? '' : prev.hourly_rate,
      total_amount: newType === 'contract' ? '' : prev.total_amount,
    }));
  };

  // Exact same calculation logic as ProjectModal
  const calculateTotalAmount = () => {
    if (formData.estimated_hours && formData.hourly_rate) {
      return parseFloat(formData.estimated_hours) * parseFloat(formData.hourly_rate);
    }
    return 0;
  };

  // Exact same contract filtering logic as ProjectModal
  const getAvailableContracts = () => {
    if (!formData.client_id) return [];
    return contracts.filter(contract => 
      contract.client_id === parseInt(formData.client_id) && 
      contract.status === 'active'
    );
  };

  // Exact same submit logic as ProjectModal
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const submitData = {
        name: formData.name,
        description: formData.description,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        delivery_date: formData.delivery_date || null,
        status: formData.status,
        notes: formData.notes || null,
      };

      if (formData.project_type === 'contract') {
        submitData.contract_id = formData.contract_id ? parseInt(formData.contract_id) : null;
        submitData.client_id = formData.client_id ? parseInt(formData.client_id) : null;
        submitData.is_independent = false;
      } else {
        submitData.is_independent = true;
        submitData.independent_client_id = formData.independent_client_id ? parseInt(formData.independent_client_id) : null;
        submitData.client_name = formData.client_name || null;
        submitData.client_email = formData.client_email || null;
        submitData.client_phone = formData.client_phone || null;
        submitData.hourly_rate = formData.hourly_rate ? parseFloat(formData.hourly_rate) : null;
        submitData.total_amount = formData.total_amount ? parseFloat(formData.total_amount) : calculateTotalAmount();
        submitData.is_paid = formData.is_paid;
        submitData.purchase_order_number = formData.purchase_order_number || null;
      }

      let response;
      if (isEditing) {
        response = await projectsApi.update(project.id, submitData);
      } else {
        response = await projectsApi.create(submitData);
      }

      onProjectSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return formData.project_type;
      case 2:
        return formData.name;
      case 3:
        if (formData.project_type === 'contract') {
          return formData.client_id;
        } else {
          return formData.client_name;
        }
      case 4:
        return true;
      default:
        return false;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Editar Proyecto' : 'Nuevo Proyecto'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Paso {currentStep} de {steps.length}: {steps[currentStep - 1].title}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <div key={step.number} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    isCompleted ? 'bg-green-600 text-white' :
                    isActive ? 'bg-blue-600 text-white' :
                    'bg-gray-300 text-gray-600'
                  }`}>
                    {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <div className="ml-2 hidden sm:block">
                    <div className={`text-sm font-medium ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-0.5 mx-4 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Step 1: Project Type */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Building className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Tipo de Proyecto
                </h3>
                <p className="text-gray-600">
                  Selecciona cómo se va a manejar este proyecto
                </p>
              </div>

              <div className="space-y-4">
                <div 
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                    formData.project_type === 'contract' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleProjectTypeChange({ target: { value: 'contract' } })}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="project_type"
                      value="contract"
                      checked={formData.project_type === 'contract'}
                      onChange={handleProjectTypeChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div className="ml-3">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-blue-600 mr-2" />
                        <div className="text-lg font-medium text-gray-900">
                          Proyecto vinculado a un contrato existente
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        El proyecto consumirá horas de un contrato existente
                      </div>
                    </div>
                  </div>
                </div>

                <div 
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                    formData.project_type === 'independent' 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleProjectTypeChange({ target: { value: 'independent' } })}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="project_type"
                      value="independent"
                      checked={formData.project_type === 'independent'}
                      onChange={handleProjectTypeChange}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    <div className="ml-3">
                      <div className="flex items-center">
                        <Building className="w-5 h-5 text-purple-600 mr-2" />
                        <div className="text-lg font-medium text-gray-900">
                          Proyecto vinculado a un cliente pero con facturación propia
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Proyecto independiente con tarifas y facturación específica
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Basic Information */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Folder className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Información Básica
                </h3>
                <p className="text-gray-600">
                  Datos principales del proyecto
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    <Folder className="w-4 h-4 inline mr-1" />
                    Nombre del Proyecto *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Nombre descriptivo del proyecto"
                  />
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="active">Activo</option>
                    <option value="on_hold">En Pausa</option>
                    <option value="completed">Completado - Listo para facturar</option>
                    <option value="ready_to_invoice">Finalizado - Pendiente por facturar</option>
                    <option value="invoiced">Facturado</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Descripción detallada del proyecto..."
                />
              </div>

              <div>
                <label htmlFor="estimated_hours" className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Horas Estimadas
                </label>
                <input
                  type="number"
                  id="estimated_hours"
                  name="estimated_hours"
                  value={formData.estimated_hours}
                  onChange={handleInputChange}
                  step="0.25"
                  min="0"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Ejemplo: 40.5"
                />
              </div>
            </div>
          )}

          {/* Step 3: Client and Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <User className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Cliente y Detalles
                </h3>
                <p className="text-gray-600">
                  Configuración de cliente y información específica
                </p>
              </div>

              {/* Contract Project Client Selection */}
              {formData.project_type === 'contract' && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-gray-900">Vinculación a Cliente y Contrato</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 mb-2">
                        <User className="w-4 h-4 inline mr-1" />
                        Cliente *
                      </label>
                      <select
                        id="client_id"
                        name="client_id"
                        value={formData.client_id}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Seleccionar cliente...</option>
                        {clients.map(client => (
                          <option key={client.id} value={client.id}>
                            {client.name || client.company}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="contract_id" className="block text-sm font-medium text-gray-700 mb-2">
                        <FileText className="w-4 h-4 inline mr-1" />
                        Contrato (Opcional)
                      </label>
                      <select
                        id="contract_id"
                        name="contract_id"
                        value={formData.contract_id}
                        onChange={handleInputChange}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        disabled={!formData.client_id}
                      >
                        <option value="">Sin contrato específico</option>
                        {getAvailableContracts().map(contract => (
                          <option key={contract.id} value={contract.id}>
                            {contract.contract_number} - {contract.description}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Las horas se descontarán del contrato seleccionado
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Independent Project Client Information */}
              {formData.project_type === 'independent' && (
                <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
                  <h3 className="font-medium text-gray-900">Información del Cliente Independiente</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="independent_client_id" className="block text-sm font-medium text-gray-700 mb-2">
                        <User className="w-4 h-4 inline mr-1" />
                        ¿Usar Cliente Existente?
                      </label>
                      <select
                        id="independent_client_id"
                        name="independent_client_id"
                        value={formData.independent_client_id}
                        onChange={handleInputChange}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Crear nuevo cliente para este proyecto</option>
                        {availableClients.map(client => (
                          <option key={client.id} value={client.id}>
                            {client.name || client.company} - {client.email}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Puedes seleccionar un cliente existente o crear uno nuevo
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="client_name" className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre del Cliente *
                        </label>
                        <input
                          type="text"
                          id="client_name"
                          name="client_name"
                          value={formData.client_name}
                          onChange={handleInputChange}
                          required={formData.project_type === 'independent'}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="Nombre o empresa del cliente"
                        />
                      </div>

                      <div>
                        <label htmlFor="client_email" className="block text-sm font-medium text-gray-700 mb-2">
                          Email del Cliente
                        </label>
                        <input
                          type="email"
                          id="client_email"
                          name="client_email"
                          value={formData.client_email}
                          onChange={handleInputChange}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="cliente@empresa.com"
                        />
                      </div>

                      <div>
                        <label htmlFor="client_phone" className="block text-sm font-medium text-gray-700 mb-2">
                          Teléfono del Cliente
                        </label>
                        <input
                          type="tel"
                          id="client_phone"
                          name="client_phone"
                          value={formData.client_phone}
                          onChange={handleInputChange}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="+57-1-555-0000"
                        />
                      </div>

                      <div>
                        <label htmlFor="purchase_order_number" className="block text-sm font-medium text-gray-700 mb-2">
                          <FileText className="w-4 h-4 inline mr-1" />
                          Número de Orden de Compra
                        </label>
                        <input
                          type="text"
                          id="purchase_order_number"
                          name="purchase_order_number"
                          value={formData.purchase_order_number}
                          onChange={handleInputChange}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="OC-2024-001"
                        />
                      </div>
                    </div>

                    {/* Financial Information for Independent Projects */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                      <div>
                        <label htmlFor="hourly_rate" className="block text-sm font-medium text-gray-700 mb-2">
                          <DollarSign className="w-4 h-4 inline mr-1" />
                          Tarifa por Hora (COP)
                        </label>
                        <input
                          type="number"
                          id="hourly_rate"
                          name="hourly_rate"
                          value={formData.hourly_rate}
                          onChange={handleInputChange}
                          min="0"
                          step="1000"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="75000"
                        />
                      </div>

                      <div>
                        <label htmlFor="total_amount" className="block text-sm font-medium text-gray-700 mb-2">
                          Valor Total (COP)
                        </label>
                        <input
                          type="number"
                          id="total_amount"
                          name="total_amount"
                          value={formData.total_amount || calculateTotalAmount()}
                          onChange={handleInputChange}
                          min="0"
                          step="1000"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="Auto-calculado"
                        />
                        {calculateTotalAmount() > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Auto-calculado: {calculateTotalAmount().toLocaleString('es-CO')} COP
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Final Configuration */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Check className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Configuración Final
                </h3>
                <p className="text-gray-600">
                  Fechas, notas y configuraciones adicionales
                </p>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    id="start_date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Finalización
                  </label>
                  <input
                    type="date"
                    id="end_date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    min={formData.start_date}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="delivery_date" className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Entrega
                  </label>
                  <input
                    type="date"
                    id="delivery_date"
                    name="delivery_date"
                    value={formData.delivery_date}
                    onChange={handleInputChange}
                    min={formData.start_date}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Fecha comprometida de entrega al cliente
                  </p>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Notas Adicionales
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Notas adicionales sobre el proyecto, requerimientos especiales, etc."
                />
              </div>

              {/* Payment Status for Independent Projects */}
              {formData.project_type === 'independent' && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_paid"
                      checked={formData.is_paid}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      Proyecto pagado
                    </span>
                  </label>
                </div>
              )}

              {/* Summary Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Resumen del Proyecto</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Nombre:</span>
                    <span className="ml-2 text-gray-900">{formData.name || 'Sin especificar'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Tipo:</span>
                    <span className="ml-2 text-gray-900">
                      {formData.project_type === 'contract' ? 'Vinculado a contrato' : 'Independiente'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Cliente:</span>
                    <span className="ml-2 text-gray-900">
                      {formData.project_type === 'contract' 
                        ? (clients.find(c => c.id === parseInt(formData.client_id))?.name || 'Sin seleccionar')
                        : (formData.client_name || 'Sin especificar')
                      }
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Horas estimadas:</span>
                    <span className="ml-2 text-gray-900">{formData.estimated_hours || '0'} horas</span>
                  </div>
                  {formData.project_type === 'independent' && formData.hourly_rate && (
                    <>
                      <div>
                        <span className="font-medium text-gray-700">Tarifa por hora:</span>
                        <span className="ml-2 text-gray-900">
                          {parseFloat(formData.hourly_rate).toLocaleString('es-CO')} COP
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Valor total:</span>
                        <span className="ml-2 text-gray-900">
                          {(formData.total_amount || calculateTotalAmount()).toLocaleString('es-CO')} COP
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </button>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={!canProceedToNextStep()}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {loading ? 'GUARDANDO...' : (isEditing ? 'ACTUALIZAR PROYECTO' : 'CREAR PROYECTO')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectWizard;