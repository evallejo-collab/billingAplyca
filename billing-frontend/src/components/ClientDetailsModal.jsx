import { useState, useEffect } from 'react';
import { clientsApi } from '../services/api';
import { formatCOP } from '../utils/currency';
import { 
  X, 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  FileText, 
  User,
  Calendar,
  DollarSign,
  Clock,
  Folder,
  Activity,
  Eye
} from 'lucide-react';

const ClientDetailsModal = ({ isOpen, onClose, client }) => {
  const [clientDetails, setClientDetails] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    if (isOpen && client) {
      loadClientDetails();
    }
  }, [isOpen, client]);

  const loadClientDetails = async () => {
    setLoading(true);
    try {
      // Load client summary
      const summaryResponse = await clientsApi.getSummary(client.id);
      if (summaryResponse.data.success) {
        setClientDetails(summaryResponse.data.client);
      }

      // Load contracts
      const contractsResponse = await clientsApi.getContracts(client.id);
      if (contractsResponse.data.success) {
        setContracts(contractsResponse.data.contracts || []);
      }

      // Load projects
      const projectsResponse = await clientsApi.getProjects(client.id);
      if (projectsResponse.data.success) {
        setProjects(projectsResponse.data.projects || []);
      }
    } catch (error) {
      console.error('Error loading client details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !client) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'No definida';
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { label: 'Activo', className: 'bg-green-100 text-green-800' },
      completed: { label: 'Completado', className: 'bg-blue-100 text-blue-800' },
      on_hold: { label: 'En Espera', className: 'bg-yellow-100 text-yellow-800' },
      cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center">
            <Building className="w-6 h-6 mr-3 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{client.name || client.company}</h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('summary')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'summary'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Activity className="w-4 h-4 inline mr-1" />
              Resumen
            </button>
            <button
              onClick={() => setActiveTab('contracts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'contracts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-1" />
              Contratos ({contracts.length})
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'projects'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Folder className="w-4 h-4 inline mr-1" />
              Proyectos ({projects.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Cargando detalles...</span>
            </div>
          ) : (
            <>
              {/* Summary Tab */}
              {activeTab === 'summary' && (
                <div className="space-y-6">
                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Información de Contacto</h3>
                      <div className="space-y-3">
                        <div className="flex items-center text-sm">
                          <Mail className="w-4 h-4 text-gray-400 mr-3" />
                          <span>{client.email}</span>
                        </div>
                        {client.phone && (
                          <div className="flex items-center text-sm">
                            <Phone className="w-4 h-4 text-gray-400 mr-3" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        {client.address && (
                          <div className="flex items-start text-sm">
                            <MapPin className="w-4 h-4 text-gray-400 mr-3 mt-0.5" />
                            <span>{client.address}</span>
                          </div>
                        )}
                        {client.website && (
                          <div className="flex items-center text-sm">
                            <Globe className="w-4 h-4 text-gray-400 mr-3" />
                            <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {client.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Información Empresarial</h3>
                      <div className="space-y-3">
                        {client.tax_id && (
                          <div className="flex items-center text-sm">
                            <FileText className="w-4 h-4 text-gray-400 mr-3" />
                            <span>NIT: {client.tax_id}</span>
                          </div>
                        )}
                        {client.contact_person && (
                          <div className="flex items-center text-sm">
                            <User className="w-4 h-4 text-gray-400 mr-3" />
                            <span>Contacto: {client.contact_person}</span>
                          </div>
                        )}
                        <div className="flex items-center text-sm">
                          <Calendar className="w-4 h-4 text-gray-400 mr-3" />
                          <span>Cliente desde: {formatDate(client.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  {clientDetails && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen Financiero</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCOP(clientDetails.total_contract_value || 0)}
                          </p>
                          <p className="text-sm text-gray-600">Valor Contratos</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCOP(clientDetails.total_project_value || 0)}
                          </p>
                          <p className="text-sm text-gray-600">Valor Proyectos</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCOP(clientDetails.total_contract_billed || 0)}
                          </p>
                          <p className="text-sm text-gray-600">Facturado Contratos</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCOP(clientDetails.total_project_billed || 0)}
                          </p>
                          <p className="text-sm text-gray-600">Facturado Proyectos</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {client.notes && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Notas</h3>
                      <p className="text-sm text-gray-600">{client.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Contracts Tab */}
              {activeTab === 'contracts' && (
                <div className="space-y-4">
                  {contracts.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Sin contratos</h3>
                      <p className="mt-1 text-sm text-gray-500">Este cliente no tiene contratos registrados.</p>
                    </div>
                  ) : (
                    contracts.map((contract) => (
                      <div key={contract.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">{contract.contract_number}</h4>
                            <p className="text-sm text-gray-600">{contract.description}</p>
                          </div>
                          {getStatusBadge(contract.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-500">Horas Totales</p>
                            <p className="text-sm font-medium">{contract.total_hours}h</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Horas Usadas</p>
                            <p className="text-sm font-medium">{contract.used_hours || 0}h</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Horas Restantes</p>
                            <p className="text-sm font-medium">{contract.remaining_hours}h</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Valor Total</p>
                            <p className="text-sm font-medium">{formatCOP(contract.total_amount)}</p>
                          </div>
                        </div>

                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Inicio: {formatDate(contract.start_date)}</span>
                          <span>Fin: {formatDate(contract.end_date)}</span>
                          <span>{contract.entries_count || 0} registros</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Projects Tab */}
              {activeTab === 'projects' && (
                <div className="space-y-4">
                  {projects.length === 0 ? (
                    <div className="text-center py-8">
                      <Folder className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Sin proyectos</h3>
                      <p className="mt-1 text-sm text-gray-500">Este cliente no tiene proyectos registrados.</p>
                    </div>
                  ) : (
                    projects.map((project) => (
                      <div key={project.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">{project.name}</h4>
                            <p className="text-sm text-gray-600">{project.description}</p>
                          </div>
                          {getStatusBadge(project.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-500">Horas Estimadas</p>
                            <p className="text-sm font-medium">{project.estimated_hours || 0}h</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Horas Usadas</p>
                            <p className="text-sm font-medium">{project.used_hours || 0}h</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Horas Restantes</p>
                            <p className="text-sm font-medium">{project.remaining_hours || 0}h</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Costo Actual</p>
                            <p className="text-sm font-medium">{formatCOP(project.current_cost || 0)}</p>
                          </div>
                        </div>

                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Inicio: {formatDate(project.start_date)}</span>
                          <span>Fin: {formatDate(project.end_date)}</span>
                          <span>{project.entries_count || 0} registros</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="btn-secondary">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientDetailsModal;