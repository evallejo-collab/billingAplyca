import { useState, useEffect } from 'react';
import { clientsApi, projectsApi, contractsApi, timeEntriesApi } from '../services/supabaseApi';
import { useAuth } from '../context/AuthContext';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Building, 
  Folder, 
  Clock, 
  Calendar,
  FileText,
  Save,
  CheckCircle
} from 'lucide-react';

const TimeEntryWizard = ({ isOpen, onClose, onTimeEntrySaved, selectedEntry, isEditing }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data states
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  
  // Form data
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [timeDetails, setTimeDetails] = useState({
    task_category: '',
    description: '',
    hours_used: '',
    entry_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const steps = [
    { number: 1, title: 'Seleccionar Empresa', icon: Building },
    { number: 2, title: 'Seleccionar Proyecto', icon: Folder },
    { number: 3, title: 'Detalles del Tiempo', icon: Clock },
    { number: 4, title: 'Confirmación', icon: CheckCircle }
  ];

  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        await loadClients();
        await loadProjects();
        
        if (isEditing && selectedEntry) {
          // Pre-populate for editing after data is loaded
          await populateForEditing();
        } else {
          resetWizard();
        }
      };
      
      loadData();
    }
  }, [isOpen, selectedEntry, isEditing]);

  useEffect(() => {
    if (selectedClient) {
      // Filter projects by selected client
      const clientProjects = projects.filter(project => 
        project.client_id === selectedClient.id || 
        project.independent_client_id === selectedClient.id
      );
      setFilteredProjects(clientProjects);
    } else {
      setFilteredProjects([]);
    }
  }, [selectedClient, projects]);

  const loadClients = async () => {
    try {
      const response = await clientsApi.getAll();
      setClients(response.data || []);
    } catch (err) {
      // Error loading clients
    }
  };

  const loadProjects = async () => {
    try {
      const response = await projectsApi.getAll();
      setProjects(response.data || []);
    } catch (err) {
      // Error loading projects
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setSelectedClient(null);
    setSelectedProject(null);
    setTimeDetails({
      task_category: '',
      description: '',
      hours_used: '',
      entry_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setError(null);
  };

  const populateForEditing = async () => {
    if (!selectedEntry) return;
    
    
    try {
      // Find the project associated with this entry
      let project = null;
      if (selectedEntry.project_id) {
        project = projects.find(p => p.id === selectedEntry.project_id);
        if (!project) {
          // If not in loaded projects, try to load it separately
          const response = await projectsApi.getById(selectedEntry.project_id);
          project = response.data;
        }
      }
      
      // Find the client associated with the project or entry
      let client = null;
      if (project) {
        // For contract projects, get client from contract
        if (project.contract_id) {
          const contractResponse = await contractsApi.getById(project.contract_id);
          if (contractResponse.data?.client) {
            client = contractResponse.data.client;
          }
        } else if (project.client_id) {
          // For independent projects, get client directly
          client = clients.find(c => c.id === project.client_id);
          if (!client) {
            const clientResponse = await clientsApi.getById(project.client_id);
            client = clientResponse.data;
          }
        }
      }
      
      // Set the form data
      if (client) {
        setSelectedClient(client);
      }
      if (project) {
        setSelectedProject(project);
      }
      
      setTimeDetails({
        task_category: selectedEntry.task_category || '',
        description: selectedEntry.description || '',
        hours_used: selectedEntry.hours_used?.toString() || '',
        entry_date: selectedEntry.entry_date || new Date().toISOString().split('T')[0],
        notes: selectedEntry.notes || ''
      });
      
      // Start at the time details step for editing
      setCurrentStep(3);
      
    } catch (error) {
      setError('Error cargando datos para edición');
    }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
    setError(null);
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!selectedClient) {
          setError('Por favor selecciona una empresa');
          return false;
        }
        return true;
      case 2:
        if (!selectedProject) {
          setError('Por favor selecciona un proyecto');
          return false;
        }
        return true;
      case 3:
        if (!timeDetails.task_category.trim()) {
          setError('Por favor ingresa una categoría de tarea');
          return false;
        }
        if (!timeDetails.hours_used || parseInt(timeDetails.hours_used) <= 0) {
          setError('Por favor ingresa las horas trabajadas');
          return false;
        }
        if (!timeDetails.entry_date) {
          setError('Por favor selecciona una fecha');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setLoading(true);
    try {
      // Find the contract associated with the project
      let contractId;
      if (!selectedProject.is_independent && selectedProject.contract_id) {
        contractId = selectedProject.contract_id;
      } else {
        // For independent projects, get the first available contract as dummy
        try {
          const contractsResponse = await contractsApi.getAll();
          const firstContract = contractsResponse.data && contractsResponse.data.length > 0 ? contractsResponse.data[0] : null;
          contractId = firstContract ? firstContract.id : 1;
        } catch (error) {
          console.warn('Could not load contracts for independent project, using default ID 1:', error);
          contractId = 1;
        }
      }

      const timeEntryData = {
        project_id: selectedProject.id,
        contract_id: contractId,
        task_category: timeDetails.task_category,
        description: timeDetails.description,
        hours_used: parseInt(timeDetails.hours_used),
        entry_date: timeDetails.entry_date,
        notes: timeDetails.notes,
        created_by: user?.id
      };

      let response;
      if (isEditing && selectedEntry) {
        response = await timeEntriesApi.update(selectedEntry.id, timeEntryData);
      } else {
        response = await timeEntriesApi.create(timeEntryData);
      }

      if (response.success) {
        onTimeEntrySaved();
        onClose();
        resetWizard();
      }
    } catch (err) {
      setError(err.message || 'Error al guardar la entrada de tiempo');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => {
        const isActive = step.number === currentStep;
        const isCompleted = step.number < currentStep;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${isCompleted 
                  ? 'bg-green-500 text-white' 
                  : isActive 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-300 text-gray-600'
                }
              `}>
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  step.number
                )}
              </div>
              <div className="ml-2 hidden sm:block">
                <p className={`text-xs font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                  {step.title}
                </p>
              </div>
            </div>
            {!isLast && (
              <div className={`flex-1 h-0.5 mx-4 ${
                isCompleted ? 'bg-green-500' : 'bg-gray-300'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Building className="w-12 h-12 text-blue-500 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-gray-900">Seleccionar Empresa</h3>
        <p className="text-sm text-gray-600">Elige la empresa para la cual registrarás tiempo</p>
      </div>
      
      <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto">
        {clients.map((client) => (
          <button
            key={client.id}
            onClick={() => setSelectedClient(client)}
            className={`
              text-left p-4 border-2 rounded-lg transition-all hover:shadow-md
              ${selectedClient?.id === client.id 
                ? 'border-blue-500 bg-blue-50 shadow-md' 
                : 'border-gray-200 hover:border-blue-300'
              }
            `}
          >
            <div className="flex items-center">
              <Building className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <p className="font-medium text-gray-900">{client.name}</p>
                <p className="text-sm text-gray-500">{client.company}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Folder className="w-12 h-12 text-blue-500 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-gray-900">Seleccionar Proyecto</h3>
        <p className="text-sm text-gray-600">
          Proyectos de <span className="font-medium text-blue-600">{selectedClient?.name}</span>
        </p>
      </div>
      
      {filteredProjects.length === 0 ? (
        <div className="text-center py-8">
          <Folder className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">No hay proyectos disponibles para esta empresa</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto">
          {filteredProjects.map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedProject(project)}
              className={`
                text-left p-4 border-2 rounded-lg transition-all hover:shadow-md
                ${selectedProject?.id === project.id 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : 'border-gray-200 hover:border-blue-300'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Folder className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{project.name}</p>
                    <p className="text-sm text-gray-500">{project.description}</p>
                  </div>
                </div>
                <span className={`
                  px-2 py-1 text-xs rounded-full
                  ${project.is_independent 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                  }
                `}>
                  {project.is_independent ? 'Independiente' : 'Contrato'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Clock className="w-12 h-12 text-blue-500 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-gray-900">Detalles del Tiempo</h3>
        <p className="text-sm text-gray-600">
          Registrando tiempo para <span className="font-medium text-blue-600">{selectedProject?.name}</span>
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoría de Tarea *
          </label>
          <select
            value={timeDetails.task_category}
            onChange={(e) => setTimeDetails({...timeDetails, task_category: e.target.value})}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Seleccionar categoría...</option>
            <option value="soporte_general">Soporte general</option>
            <option value="desarrollo">Desarrollo</option>
            <option value="qa">Q.A</option>
            <option value="gestion">Gestión</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción
          </label>
          <textarea
            value={timeDetails.description}
            onChange={(e) => setTimeDetails({...timeDetails, description: e.target.value})}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Describe brevemente las actividades realizadas..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Horas Trabajadas *
            </label>
            <input
              type="number"
              min="1"
              value={timeDetails.hours_used}
              onChange={(e) => setTimeDetails({...timeDetails, hours_used: e.target.value})}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="8"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha *
            </label>
            <input
              type="date"
              value={timeDetails.entry_date}
              onChange={(e) => setTimeDetails({...timeDetails, entry_date: e.target.value})}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notas Adicionales
          </label>
          <textarea
            value={timeDetails.notes}
            onChange={(e) => setTimeDetails({...timeDetails, notes: e.target.value})}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Notas opcionales..."
          />
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-gray-900">Confirmar Registro</h3>
        <p className="text-sm text-gray-600">Revisa los detalles antes de guardar</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">Empresa:</span>
          <span className="text-sm text-gray-900">{selectedClient?.name}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">Proyecto:</span>
          <span className="text-sm text-gray-900">{selectedProject?.name}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">Categoría:</span>
          <span className="text-sm text-gray-900">
            {timeDetails.task_category === 'soporte_general' && 'Soporte general'}
            {timeDetails.task_category === 'desarrollo' && 'Desarrollo'}
            {timeDetails.task_category === 'qa' && 'Q.A'}
            {timeDetails.task_category === 'gestion' && 'Gestión'}
            {!['soporte_general', 'desarrollo', 'qa', 'gestion'].includes(timeDetails.task_category) && timeDetails.task_category}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">Horas:</span>
          <span className="text-sm text-gray-900">{parseInt(timeDetails.hours_used) || 0} horas</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">Fecha:</span>
          <span className="text-sm text-gray-900">
            {new Date(timeDetails.entry_date).toLocaleDateString('es-ES')}
          </span>
        </div>
        {timeDetails.description && (
          <div>
            <span className="text-sm font-medium text-gray-600">Descripción:</span>
            <p className="text-sm text-gray-900 mt-1">{timeDetails.description}</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return null;
    }
  };

  const renderButtons = () => (
    <div className="flex justify-between pt-4 border-t border-gray-200">
      <button
        onClick={currentStep === 1 ? onClose : handlePrevious}
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        {currentStep === 1 ? (
          <>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </>
        ) : (
          <>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Anterior
          </>
        )}
      </button>

      {currentStep < 4 ? (
        <button
          onClick={handleNext}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Siguiente
          <ChevronRight className="w-4 h-4 ml-2" />
        </button>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {loading ? 'Guardando...' : 'Guardar Registro'}
        </button>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative inline-block w-full max-w-2xl p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="absolute top-4 right-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Editar Registro de Tiempo' : 'Nuevo Registro de Tiempo'}
            </h2>
          </div>

          {renderStepIndicator()}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="min-h-[400px]">
            {renderCurrentStep()}
          </div>

          {renderButtons()}
        </div>
      </div>
    </div>
  );
};

export default TimeEntryWizard;