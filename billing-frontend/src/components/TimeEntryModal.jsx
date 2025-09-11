import { useState, useEffect } from 'react';
import { contractsApi, projectsApi, timeEntriesApi } from '../services/supabaseApi';
import { formatCOP } from '../utils/currency';
import { useAuth } from '../context/AuthContext';
import { X, Save, Clock, Calendar, FileText, User, AlertCircle, Tag, Folder, Building } from 'lucide-react';

const TimeEntryModal = ({ isOpen, onClose, activeContracts, onTimeEntrySaved, selectedEntry, isEditing }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    project_type: 'contract', // 'contract' or 'independent'
    contract_id: '',
    project_id: '',
    task_category: '',
    description: '',
    hours_used: '',
    entry_date: new Date().toISOString().split('T')[0],
    created_by: '',
    notes: '',
    category_id: '1',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [contractProjects, setContractProjects] = useState([]);
  const [independentProjects, setIndependentProjects] = useState([]);

  useEffect(() => {
    if (isOpen) {
      if (isEditing && selectedEntry) {
        // Populate form with selected entry data
        const newFormData = {
          // If it has both contract_id and project_id, it's a contract project
          // If it only has project_id (no contract_id), it's independent
          project_type: selectedEntry.contract_id ? 'contract' : 'independent',
          contract_id: selectedEntry.contract_id ? selectedEntry.contract_id.toString() : '',
          project_id: selectedEntry.project_id ? selectedEntry.project_id.toString() : '',
          task_category: selectedEntry.task_category || '',
          description: selectedEntry.description || '',
          hours_used: selectedEntry.hours_used ? selectedEntry.hours_used.toString() : '',
          entry_date: selectedEntry.entry_date || new Date().toISOString().split('T')[0],
          created_by: selectedEntry.created_by || user?.full_name || '',
          notes: selectedEntry.notes || '',
        };
        setFormData(newFormData);
        
        // If it's a contract entry, load the projects for that contract
        if (selectedEntry.contract_id) {
          loadProjectsForContract(selectedEntry.contract_id.toString());
        }
      } else {
        resetForm();
      }
      setError(null);
      loadIndependentProjects();
    }
  }, [isOpen, isEditing, selectedEntry, activeContracts]);

  useEffect(() => {
    if (formData.project_type === 'contract' && formData.contract_id) {
      const contract = activeContracts.find(c => c.id === parseInt(formData.contract_id));
      setSelectedContract(contract);
      loadProjectsForContract(formData.contract_id);
      setSelectedProject(null);
    } else if (formData.project_type === 'independent' && formData.project_id) {
      const project = independentProjects.find(p => p.id === parseInt(formData.project_id));
      setSelectedProject(project);
      setSelectedContract(null);
    } else {
      setSelectedContract(null);
      setSelectedProject(null);
      setContractProjects([]);
    }
  }, [formData.project_type, formData.contract_id, formData.project_id, activeContracts, independentProjects]);

  const resetForm = () => {
    setFormData({
      project_type: 'contract',
      contract_id: '',
      project_id: '',
      task_category: '',
      description: '',
      hours_used: '',
      entry_date: new Date().toISOString().split('T')[0],
      created_by: user?.full_name || '',
      notes: '',
    });
    setSelectedContract(null);
    setSelectedProject(null);
    setContractProjects([]);
  };


  const loadProjectsForContract = async (contractId) => {
    try {
      const response = await projectsApi.getByContract(contractId);
      setContractProjects(response.data || []);
    } catch (error) {
      setContractProjects([]);
    }
  };

  const loadIndependentProjects = async () => {
    try {
      const response = await projectsApi.getIndependent();
      const activeProjects = (response.data || []).filter(project => project.status === 'active');
      setIndependentProjects(activeProjects);
    } catch (error) {
      setIndependentProjects([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const submitData = {
        task_category: formData.task_category || null,
        description: formData.description || null,
        hours_used: parseInt(formData.hours_used),
        entry_date: formData.entry_date,
        notes: formData.notes || null,
      };
      
      // Always include created_by as user ID (not name)
      if (!isEditing) {
        // For new entries, use the authenticated user's ID
        submitData.created_by = user?.id || null;
      }
      // For updates, don't include created_by to avoid changing the original creator

      // Add contract or project specific data
      if (formData.project_type === 'contract') {
        submitData.contract_id = parseInt(formData.contract_id);
        submitData.project_id = formData.project_id ? parseInt(formData.project_id) : null;
      } else {
        submitData.contract_id = null;
        submitData.project_id = parseInt(formData.project_id);
      }

      if (isEditing && selectedEntry) {
        // Update existing entry
        const response = await timeEntriesApi.update(selectedEntry.id, submitData);
      } else {
        // Create new entry
        const response = await timeEntriesApi.create(submitData);
      }
      
      onTimeEntrySaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  const formatHours = (hours) => {
    return `${parseFloat(hours || 0).toFixed(1)}h`;
  };

  const calculateAmount = () => {
    if (!formData.hours_used) return 0;
    
    if (formData.project_type === 'contract' && selectedContract) {
      return parseInt(formData.hours_used) * parseFloat(selectedContract.hourly_rate);
    } else if (formData.project_type === 'independent' && selectedProject) {
      return parseInt(formData.hours_used) * parseFloat(selectedProject.hourly_rate);
    }
    
    return 0;
  };

  const getRemainingHours = () => {
    if (formData.project_type === 'contract' && selectedContract) {
      return parseFloat(selectedContract.remaining_hours);
    } else if (formData.project_type === 'independent' && selectedProject) {
      return parseFloat(selectedProject.remaining_hours);
    }
    return 0;
  };

  const isValidHours = () => {
    if (!formData.hours_used) return true;
    
    const requestedHours = parseInt(formData.hours_used);
    
    if (formData.project_type === 'contract' && selectedContract) {
      const availableHours = parseFloat(selectedContract.remaining_hours);
      // Skip validation if contract has 0 estimated hours
      if (parseFloat(selectedContract.estimated_hours) === 0) return true;
      return requestedHours <= availableHours;
    } else if (formData.project_type === 'independent' && selectedProject) {
      const availableHours = parseFloat(selectedProject.remaining_hours);
      // Skip validation if project has 0 estimated hours
      if (parseFloat(selectedProject.estimated_hours) === 0) return true;
      return requestedHours <= availableHours;
    }
    
    return true;
  };

  const getHourlyRate = () => {
    if (formData.project_type === 'contract' && selectedContract) {
      return selectedContract.hourly_rate;
    } else if (formData.project_type === 'independent' && selectedProject) {
      return selectedProject.hourly_rate;
    }
    return 0;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Editar Tiempo de Trabajo' : 'Registrar Tiempo de Trabajo'}
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Type Selection */}
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tipo de Trabajo *
              </label>
              <select
                name="project_type"
                value={formData.project_type}
                onChange={handleInputChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="contract">Trabajo de Contrato - Horas descontadas de contrato</option>
                <option value="independent">Proyecto Independiente - Pagos separados</option>
              </select>
            </div>

            {/* Contract Selection */}
            {formData.project_type === 'contract' && (
              <div>
                <label htmlFor="contract_id" className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Contrato *
                </label>
                <select
                  id="contract_id"
                  name="contract_id"
                  value={formData.contract_id}
                  onChange={handleInputChange}
                  required={formData.project_type === 'contract'}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Seleccionar contrato...</option>
                  {activeContracts.map(contract => (
                    <option key={contract.id} value={contract.id}>
                      {contract.client_name} - {contract.contract_number} ({formatHours(contract.remaining_hours)} restantes)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Project Selection for Contract */}
            {formData.project_type === 'contract' && selectedContract && contractProjects.length > 0 && (
              <div>
                <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 mb-2">
                  <Folder className="w-4 h-4 inline mr-1" />
                  Proyecto (Opcional)
                </label>
                <select
                  id="project_id"
                  name="project_id"
                  value={formData.project_id}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Sin proyecto específico</option>
                  {contractProjects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Independent Project Selection */}
            {formData.project_type === 'independent' && (
              <div>
                <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 mb-2">
                  <Building className="w-4 h-4 inline mr-1" />
                  Proyecto Independiente *
                </label>
                <select
                  id="project_id"
                  name="project_id"
                  value={formData.project_id}
                  onChange={handleInputChange}
                  required={formData.project_type === 'independent'}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Seleccionar proyecto...</option>
                  {independentProjects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name} - {project.client_name} ({formatHours(project.remaining_hours || project.estimated_hours)} horas)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Contract Info */}
            {selectedContract && formData.project_type === 'contract' && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Información del Contrato</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Cliente:</span>
                    <p className="font-medium">{selectedContract.client_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Contrato:</span>
                    <p className="font-medium text-gray-600">{selectedContract.contract_number}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Horas Restantes:</span>
                    <p className="font-medium text-blue-600">{formatHours(selectedContract.remaining_hours)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Tarifa:</span>
                    <p className="font-medium">{formatCOP(selectedContract.hourly_rate)}/h</p>
                  </div>
                </div>
              </div>
            )}

            {/* Project Info */}
            {selectedProject && formData.project_type === 'independent' && (
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Información del Proyecto</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Cliente:</span>
                    <p className="font-medium">{selectedProject.client_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Horas Estimadas:</span>
                    <p className="font-medium text-purple-600">{formatHours(selectedProject.estimated_hours)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Tarifa:</span>
                    <p className="font-medium">{formatCOP(selectedProject.hourly_rate)}/h</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Valor Total:</span>
                    <p className="font-medium">{formatCOP(selectedProject.total_amount)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Task Category */}
            <div>
              <label htmlFor="task_category" className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
                Categoría de Tarea *
              </label>
              <select
                id="task_category"
                name="task_category"
                value={formData.task_category}
                onChange={handleInputChange}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Seleccionar categoría...</option>
                <option value="soporte_aplicativo">Soporte Aplicativo</option>
                <option value="desarrollo_frontend">Desarrollo Frontend</option>
                <option value="desarrollo_backend">Desarrollo Backend</option>
                <option value="analisis_requerimientos">Análisis de Requerimientos</option>
                <option value="testing_qa">Testing y QA</option>
                <option value="devops_infraestructura">DevOps e Infraestructura</option>
                <option value="documentacion">Documentación</option>
                <option value="reunion_cliente">Reunión con Cliente</option>
                <option value="capacitacion">Capacitación</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="arquitectura_diseno">Arquitectura y Diseño</option>
                <option value="integraciones">Integraciones</option>
                <option value="optimizacion">Optimización</option>
                <option value="configuracion">Configuración</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Descripción del Trabajo
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Describe el trabajo realizado o pega la URL del ticket (ej: https://app.clickup.com/t/abc123)..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Hours Used */}
              <div>
                <label htmlFor="hours_used" className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Horas Utilizadas *
                </label>
                <input
                  type="number"
                  id="hours_used"
                  name="hours_used"
                  value={formData.hours_used}
                  onChange={handleInputChange}
                  required
                  step="1"
                  min="1"
                  max={(selectedContract && formData.project_type === 'contract') ? selectedContract.remaining_hours : (selectedProject && formData.project_type === 'independent') ? selectedProject.estimated_hours : undefined}
                  className={`w-full rounded-md border px-3 py-2 text-sm focus:ring-1 ${
                    isValidHours() 
                      ? 'border-gray-300 focus:border-blue-500 focus:ring-blue-500' 
                      : 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  }`}
                  placeholder="Ejemplo: 8"
                />
                {!isValidHours() && (
                  <p className="mt-1 text-sm text-red-600">
                    No puedes registrar más horas de las disponibles ({formatHours(getRemainingHours())})
                  </p>
                )}
              </div>

              {/* Entry Date */}
              <div>
                <label htmlFor="entry_date" className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Fecha del Trabajo *
                </label>
                <input
                  type="date"
                  id="entry_date"
                  name="entry_date"
                  value={formData.entry_date}
                  onChange={handleInputChange}
                  required
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Created By */}
            <div>
              <label htmlFor="created_by" className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Creado por
              </label>
              <input
                type="text"
                id="created_by"
                name="created_by"
                value={formData.created_by}
                onChange={handleInputChange}
                disabled
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100 text-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Usuario autenticado"
              />
            </div>



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
                disabled={loading || !isValidHours()}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {loading 
                  ? (isEditing ? 'ACTUALIZANDO...' : 'REGISTRANDO...') 
                  : (isEditing ? 'ACTUALIZAR TIEMPO' : 'REGISTRAR TIEMPO')
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TimeEntryModal;