import { useState, useEffect } from 'react';
import { projectsApi, clientsApi } from '../services/supabaseApi';
import { X, Save, Folder, User, Building, FileText, Clock, DollarSign, Calendar, AlertCircle } from 'lucide-react';

const ProjectModal = ({ isOpen, onClose, project, isEditing, onProjectSaved, clients, contracts }) => {
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
      loadAvailableClients();
    }
  }, [isOpen, isEditing, project]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      estimated_hours: '',
      start_date: '',
      end_date: '',
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
      // Use the same clients from props, or load them if needed
      setAvailableClients(clients || []);
    } catch (error) {
      console.error('Error loading available clients:', error);
    }
  };

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

  const calculateTotalAmount = () => {
    if (formData.estimated_hours && formData.hourly_rate) {
      return parseFloat(formData.estimated_hours) * parseFloat(formData.hourly_rate);
    }
    return 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    console.log('🚀 FORM SUBMIT START');
    console.log('  - Complete formData:', formData);

    try {
      // Basic validation
      if (!formData.name) {
        setError('El nombre del proyecto es requerido');
        setLoading(false);
        return;
      }

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
        console.log('🔍 CONTRACT PROJECT VALIDATION:');
        console.log('  - formData.client_id:', formData.client_id);
        console.log('  - typeof formData.client_id:', typeof formData.client_id);
        
        submitData.contract_id = formData.contract_id ? parseInt(formData.contract_id) : null;
        // For contract projects, client_id is required even if no specific contract is selected
        const clientId = formData.client_id ? parseInt(formData.client_id) : null;
        
        console.log('  - parsed clientId:', clientId);
        console.log('  - isNaN(clientId):', isNaN(clientId));
        
        if (!formData.client_id || formData.client_id === '' || !clientId || isNaN(clientId)) {
          console.log('❌ CLIENT VALIDATION FAILED');
          setError('Debe seleccionar un cliente válido para proyectos asociados a contratos');
          setLoading(false);
          return;
        }
        
        console.log('✅ CLIENT VALIDATION PASSED');
        submitData.client_id = clientId;
        submitData.is_independent = false;
      } else {
        // Validation for independent projects
        if (!formData.independent_client_id || formData.independent_client_id === '') {
          setError('Debe seleccionar un cliente para proyectos independientes');
          setLoading(false);
          return;
        }

        submitData.is_independent = true;
        // For independent projects, use independent_client_id as client_id to satisfy NOT NULL constraint
        submitData.client_id = formData.independent_client_id ? parseInt(formData.independent_client_id) : null;
        submitData.contract_id = null; // Explicitly set to null for independent projects
        submitData.independent_client_id = formData.independent_client_id ? parseInt(formData.independent_client_id) : null;
        submitData.client_name = formData.client_name || null;
        submitData.client_email = formData.client_email || null;
        submitData.client_phone = formData.client_phone || null;
        submitData.hourly_rate = formData.hourly_rate ? parseFloat(formData.hourly_rate) : null;
        submitData.total_amount = formData.total_amount ? parseFloat(formData.total_amount) : calculateTotalAmount();
        submitData.is_paid = formData.is_paid;
        submitData.purchase_order_number = formData.purchase_order_number || null;
      }

      // Debug: Log what we're sending
      console.log('🔍 PROJECT MODAL DEBUG:');
      console.log('  - Form data:', formData);
      console.log('  - Submit data:', submitData);
      console.log('  - Project type:', formData.project_type);
      console.log('  - Client ID:', formData.client_id);
      console.log('  - Submit Client ID:', submitData.client_id);

      let response;
      if (isEditing) {
        response = await projectsApi.update(project.id, submitData);
      } else {
        response = await projectsApi.create(submitData);
      }

      onProjectSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableContracts = () => {
    if (!formData.client_id) return [];
    return contracts.filter(contract => 
      contract.client_id === parseInt(formData.client_id) && 
      contract.status === 'active'
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Editar Proyecto' : project ? 'Detalles del Proyecto' : 'Nuevo Proyecto'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
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

          {/* Read-only view */}
          {project && !isEditing ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Proyecto
                  </label>
                  <p className="text-lg font-semibold text-gray-900">{project.name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Proyecto
                  </label>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    project.is_independent ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {project.is_independent ? (
                      <>
                        <Building className="w-4 h-4 mr-1" />
                        Proyecto Independiente
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-1" />
                        Proyecto de Contrato
                      </>
                    )}
                  </span>
                </div>
              </div>
              
              {project.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <p className="text-gray-900">{project.description}</p>
                </div>
              )}
              
              {/* Client Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cliente
                  </label>
                  <p className="text-lg text-gray-900">{project.client_name || 'No especificado'}</p>
                </div>
                
                {!project.is_independent && project.contract_number && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contrato
                    </label>
                    <p className="text-lg text-blue-600">{project.contract_number}</p>
                  </div>
                )}
              </div>
              
              {/* Hours Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Horas Estimadas
                  </label>
                  <p className="text-lg font-semibold text-blue-600">{project.estimated_hours || 0}h</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tiempo Utilizado
                  </label>
                  <p className="text-lg font-semibold text-orange-600">{project.used_hours || 0}h</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tiempo Restante
                  </label>
                  <p className="text-lg font-semibold text-green-600">{project.remaining_hours || 0}h</p>
                </div>
              </div>
              
              {/* Financial Information - Only for independent projects */}
              {project.is_independent && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Información Financiera</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <DollarSign className="w-4 h-4 inline mr-1" />
                        Tarifa por Hora
                      </label>
                      <p className="text-lg font-semibold text-gray-900">{project.hourly_rate ? `${new Intl.NumberFormat('es-CO', {style: 'currency', currency: 'COP'}).format(project.hourly_rate)}/h` : 'No especificada'}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Valor Total
                      </label>
                      <p className="text-lg font-semibold text-gray-900">{project.total_amount ? new Intl.NumberFormat('es-CO', {style: 'currency', currency: 'COP'}).format(project.total_amount) : 'No especificado'}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Costo Actual
                      </label>
                      <p className="text-lg font-semibold text-purple-600">{new Intl.NumberFormat('es-CO', {style: 'currency', currency: 'COP'}).format(project.current_cost || 0)}</p>
                    </div>
                  </div>
                  
                  {project.paid_amount > 0 && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Monto Pagado
                        </label>
                        <p className="text-lg font-semibold text-green-600">{new Intl.NumberFormat('es-CO', {style: 'currency', currency: 'COP'}).format(project.paid_amount || 0)}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Progreso de Pago
                        </label>
                        <p className="text-lg font-semibold text-blue-600">{project.total_amount > 0 ? ((project.paid_amount / project.total_amount) * 100).toFixed(1) : 0}%</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Status and Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize
                    ${project.status === 'active' ? 'bg-green-100 text-green-800' : 
                      project.status === 'completed' ? 'bg-blue-100 text-blue-800' : 
                      project.status === 'ready_to_invoice' ? 'bg-orange-100 text-orange-800' :
                      project.status === 'invoiced' ? 'bg-purple-100 text-purple-800' :
                      project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'}`}>
                    {project.status === 'on_hold' ? 'En Pausa' : 
                     project.status === 'active' ? 'Activo' :
                     project.status === 'completed' ? 'Completado - Listo para facturar' :
                     project.status === 'ready_to_invoice' ? 'Finalizado - Pendiente por facturar' :
                     project.status === 'invoiced' ? 'Facturado' : 'Estado Desconocido'}
                  </span>
                </div>
              </div>
              
              {/* Dates Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {project.start_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Fecha de Inicio
                    </label>
                    <p className="text-gray-900">{new Date(project.start_date).toLocaleDateString('es-CO')}</p>
                  </div>
                )}
                
                {project.end_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Finalización
                    </label>
                    <p className="text-gray-900">{new Date(project.end_date).toLocaleDateString('es-CO')}</p>
                  </div>
                )}
                
                {project.delivery_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Entrega
                    </label>
                    <p className="text-lg font-semibold text-blue-600">{new Date(project.delivery_date).toLocaleDateString('es-CO')}</p>
                  </div>
                )}
              </div>
              
              {/* Purchase Order Information for Independent Projects */}
              {project.is_independent && project.purchase_order_number && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Información de Orden de Compra</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FileText className="w-4 h-4 inline mr-1" />
                      Número de Orden de Compra
                    </label>
                    <p className="text-lg font-semibold text-blue-600">{project.purchase_order_number}</p>
                  </div>
                </div>
              )}
              
              {/* Notes */}
              {project.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas Adicionales
                  </label>
                  <p className="text-gray-900">{project.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Type */}
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tipo de Proyecto *
              </label>
              <select
                name="project_type"
                value={formData.project_type}
                onChange={handleProjectTypeChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="contract">Proyecto vinculado a un contrato existente</option>
                <option value="independent">Proyecto vinculado a un cliente pero con facturación propia</option>
              </select>
            </div>

            {/* Basic Information */}
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

            {/* Description */}
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

            {/* Client and Contract Selection (for contract projects) */}
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
                      onChange={(e) => {
                        console.log('🔄 CLIENT DROPDOWN CHANGE:', e.target.value);
                        handleInputChange(e);
                      }}
                      required
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar cliente...</option>
                      {clients && clients.length > 0 ? (
                        clients.map(client => (
                          <option key={client.id} value={client.id}>
                            {client.name || client.company}
                          </option>
                        ))
                      ) : (
                        <option disabled>No hay clientes disponibles</option>
                      )}
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

            {/* Independent Client Information */}
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
                        className="form-input"
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
                        className="form-input"
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
                        className="form-input"
                        placeholder="+57-1-555-0000"
                      />
                    </div>
                  </div>

                  {/* Purchase Order Section */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
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
                </div>
              </div>
            )}

            {/* Hours and Financial Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

              {formData.project_type === 'independent' && (
                <>
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
                      step="any"
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
                      step="any"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Auto-calculado"
                    />
                    {calculateTotalAmount() > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Auto-calculado: {calculateTotalAmount().toLocaleString('es-CO')} COP
                      </p>
                    )}
                  </div>
                </>
              )}
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

            {/* Notes Section */}
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

            {/* Payment Status (for independent projects) */}
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

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {loading ? 'GUARDANDO...' : (isEditing ? 'ACTUALIZAR' : 'CREAR PROYECTO')}
              </button>
            </div>
          </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectModal;