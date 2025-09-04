import { useState, useEffect } from 'react';
import { clientsApi } from '../services/api';
import { formatCOP } from '../utils/currency';
import { 
  Plus, 
  Search, 
  Users, 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  Edit2, 
  Trash2,
  FileText,
  Folder,
  Eye,
  AlertCircle
} from 'lucide-react';
import ClientModal from './ClientModal';
import ClientDetailsModal from './ClientDetailsModal';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await clientsApi.getAll();
      if (response.data.success) {
        setClients(response.data.clients);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadClients();
      return;
    }

    try {
      setLoading(true);
      const response = await clientsApi.search(searchTerm);
      if (response.data.success) {
        setClients(response.data.clients);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = () => {
    setSelectedClient(null);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEditClient = (client) => {
    setSelectedClient(client);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleViewClient = (client) => {
    setSelectedClient(client);
    setIsDetailsModalOpen(true);
  };

  const handleDeleteClient = async (clientId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
      return;
    }

    try {
      const response = await clientsApi.delete(clientId);
      if (response.data.success) {
        loadClients();
      } else {
        alert(response.data.message);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
    setIsEditing(false);
  };

  const handleClientSaved = () => {
    loadClients();
    handleModalClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando clientes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Gestión de Clientes</h1>
          <p className="text-sm text-gray-600 mt-1">Administración y seguimiento de la cartera de clientes</p>
        </div>
        <button
          onClick={handleCreateClient}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-3 h-3 mr-1" />
          NUEVO CLIENTE
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-body">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <button
            onClick={handleSearch}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
          >
            BUSCAR
          </button>
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                loadClients();
              }}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 rounded hover:bg-gray-100 transition-colors border border-gray-200"
            >
              LIMPIAR
            </button>
          )}
        </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client) => (
          <div key={client.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-sm transition-shadow">
            <div className="p-4">
              {/* Client Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    {client.name}
                  </h3>
                  {client.company && (
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <Building className="w-4 h-4 mr-1" />
                      {client.company}
                    </div>
                  )}
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleViewClient(client)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Ver detalles"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEditClient(client)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClient(client.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{client.email}</span>
                </div>
                {client.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                    {client.phone}
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{client.address}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`text-center p-2 rounded border ${
                  (client.contracts_count || 0) > 0 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center justify-center mb-1">
                    <FileText className={`w-4 h-4 mr-1 ${
                      (client.contracts_count || 0) > 0 
                        ? 'text-green-600' 
                        : 'text-gray-600'
                    }`} />
                    <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Contratos</span>
                  </div>
                  <p className={`text-base font-semibold ${
                    (client.contracts_count || 0) > 0 
                      ? 'text-green-700' 
                      : 'text-gray-900'
                  }`}>{client.contracts_count || 0}</p>
                </div>
                <div className={`text-center p-2 rounded border ${
                  (client.projects_count || 0) > 0 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center justify-center mb-1">
                    <Folder className={`w-4 h-4 mr-1 ${
                      (client.projects_count || 0) > 0 
                        ? 'text-blue-600' 
                        : 'text-gray-600'
                    }`} />
                    <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Proyectos</span>
                  </div>
                  <p className={`text-base font-semibold ${
                    (client.projects_count || 0) > 0 
                      ? 'text-blue-700' 
                      : 'text-gray-900'
                  }`}>{client.projects_count || 0}</p>
                </div>
              </div>


              {/* Client Info */}
              {client.tax_id && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">NIT: </span>
                  <span className="text-xs font-medium text-gray-700">{client.tax_id}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {clients.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay clientes</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'No se encontraron clientes con ese criterio de búsqueda.' : 'Comienza creando tu primer cliente.'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                onClick={handleCreateClient}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                CREAR CLIENTE
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        client={selectedClient}
        isEditing={isEditing}
        onClientSaved={handleClientSaved}
      />

      <ClientDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        client={selectedClient}
      />
    </div>
  );
};

export default Clients;