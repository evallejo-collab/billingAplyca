import { useState, useEffect } from 'react';
import { contractsApi, clientsApi } from '../services/supabaseApi';
import GoogleDrivePreview from './GoogleDrivePreview';
import { X, Save, FileText, User, Calendar, DollarSign, Clock } from 'lucide-react';

const ContractModal = ({ isOpen, onClose, contract, isEditing, onContractSaved }) => {
  const [formData, setFormData] = useState({
    client_id: '',
    contract_number: '',
    description: '',
    total_hours: '',
    hourly_rate: '',
    start_date: '',
    end_date: '',
    google_drive_url: '',
  });
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadClients();
      if (contract) {
        setFormData({
          client_id: contract.client_id || '',
          contract_number: contract.contract_number || '',
          description: contract.description || '',
          total_hours: contract.total_hours || '',
          hourly_rate: contract.hourly_rate || '',
          start_date: contract.start_date || '',
          end_date: contract.end_date || '',
          google_drive_url: contract.google_drive_url || '',
        });
      } else {
        resetForm();
      }
      setError(null);
    }
  }, [isOpen, contract]);

  const loadClients = async () => {
    setLoadingClients(true);
    try {
      const response = await clientsApi.getAll();
      setClients(response.data);
    } catch (err) {
      console.error('Error loading clients:', err);
    } finally {
      setLoadingClients(false);
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      contract_number: '',
      description: '',
      total_hours: '',
      hourly_rate: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      google_drive_url: '',
    });
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
        ...formData,
        total_hours: parseFloat(formData.total_hours) || 0,
        hourly_rate: parseFloat(formData.hourly_rate) || 0,
        client_id: parseInt(formData.client_id),
      };

      // Remove empty end_date
      if (!submitData.end_date) {
        delete submitData.end_date;
      }

      let response;
      if (isEditing && contract) {
        response = await contractsApi.update(contract.id, submitData);
      } else {
        response = await contractsApi.create(submitData);
      }
      onContractSaved();
      onClose();
    } catch (err) {
      console.error('Contract submission error:', err);
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.errors) {
        setError('Errores de validación: ' + Object.values(err.response.data.errors).join(', '));
      } else {
        setError('Error al guardar el contrato: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const calculateTotal = () => {
    const hours = parseFloat(formData.total_hours) || 0;
    const rate = parseFloat(formData.hourly_rate) || 0;
    return hours * rate;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Editar Contrato' : contract ? 'Detalles del Contrato' : 'Nuevo Contrato'}
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
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Read-only view */}
          {contract && !isEditing ? (
            <div className="space-y-6">
              {/* Contract Header - Clean and Professional */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{contract.client_name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{contract.contract_number}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                  ${contract.status === 'active' ? 'bg-green-50 text-green-800 border border-green-200' : 
                    contract.status === 'completed' ? 'bg-blue-50 text-blue-800 border border-blue-200' : 
                    'bg-red-50 text-red-800 border border-red-200'}`}>
                  {contract.status === 'active' ? 'Activo' : 
                   contract.status === 'completed' ? 'Completado' : 'Cancelado'}
                </span>
              </div>

              {/* Key Metrics - Simplified */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Horas</p>
                  <p className="text-sm font-semibold text-gray-900 break-all leading-tight">{contract.total_hours}h</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Utilizadas</p>
                  <p className="text-sm font-semibold text-gray-900 break-all leading-tight">{contract.used_hours || 0}h</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Tarifa/Hora</p>
                  <p className="text-sm font-semibold text-gray-900 break-all leading-tight">{formatCurrency(contract.hourly_rate)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Valor Total</p>
                  <p className="text-sm font-semibold text-gray-900 break-all leading-tight">{formatCurrency((contract.total_hours || 0) * (contract.hourly_rate || 0))}</p>
                </div>
              </div>

              {/* Progress Section - Clean */}
              {(contract.used_hours > 0 || contract.billed_amount > 0) && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-4">Progreso</h4>
                  
                  {/* Hours Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Horas</span>
                      <span className="text-sm font-medium text-gray-900">
                        {contract.used_hours || 0} / {contract.total_hours}h ({Math.round(((contract.used_hours || 0) / contract.total_hours) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          (() => {
                            const percentage = ((contract.used_hours || 0) / contract.total_hours) * 100;
                            if (percentage >= 90) return 'bg-red-500'; // Rojo: casi agotado
                            if (percentage >= 75) return 'bg-orange-500'; // Naranja: alerta
                            if (percentage >= 50) return 'bg-yellow-500'; // Amarillo: mitad
                            if (percentage >= 25) return 'bg-blue-500'; // Azul: progreso normal
                            return 'bg-green-500'; // Verde: inicio
                          })()
                        }`}
                        style={{ width: `${Math.min(((contract.used_hours || 0) / contract.total_hours) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Billing Progress */}
                  {contract.billed_amount > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Facturación</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(contract.billed_amount || 0)} / {formatCurrency((contract.total_hours || 0) * (contract.hourly_rate || 0))}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            (() => {
                              const totalValue = (contract.total_hours || 0) * (contract.hourly_rate || 0);
                              const percentage = totalValue > 0 ? ((contract.billed_amount || 0) / totalValue) * 100 : 0;
                              if (percentage >= 100) return 'bg-green-600'; // Verde oscuro: completado
                              if (percentage >= 75) return 'bg-green-500'; // Verde: muy avanzado
                              if (percentage >= 50) return 'bg-blue-500'; // Azul: mitad facturado
                              if (percentage >= 25) return 'bg-yellow-500'; // Amarillo: progreso inicial
                              return 'bg-gray-500'; // Gris: poco avance
                            })()
                          }`}
                          style={{ width: `${Math.min(((contract.billed_amount || 0) / ((contract.total_hours || 0) * (contract.hourly_rate || 0))) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Description - Only if exists and not too long */}
              {contract.description && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-2">Descripción</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{contract.description}</p>
                </div>
              )}

              {/* Dates - Compact */}
              {(contract.start_date || contract.end_date) && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">Fechas</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {contract.start_date && (
                      <div>
                        <span className="text-gray-500">Inicio:</span>
                        <p className="font-medium text-gray-900">
                          {new Date(contract.start_date).toLocaleDateString('es-CO')}
                        </p>
                      </div>
                    )}
                    {contract.end_date && (
                      <div>
                        <span className="text-gray-500">Fin:</span>
                        <p className="font-medium text-gray-900">
                          {new Date(contract.end_date).toLocaleDateString('es-CO')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Google Drive Preview for Read-only View */}
              {contract.google_drive_url && (
                <GoogleDrivePreview
                  driveUrl={contract.google_drive_url}
                  onUrlChange={() => {}} // Read-only mode
                  label="Contrato en Google Drive"
                />
              )}
            </div>
          ) : (
            /* Edit/Create form */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Cliente *
                  </label>
                  {loadingClients ? (
                    <div className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-500">
                      Cargando clientes...
                    </div>
                  ) : (
                    <select
                      id="client_id"
                      name="client_id"
                      value={formData.client_id}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar cliente</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name || client.company}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label htmlFor="contract_number" className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Número de Contrato *
                  </label>
                  <input
                    type="text"
                    id="contract_number"
                    name="contract_number"
                    value={formData.contract_number}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Ejemplo: CT-2024-001"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows="3"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Describe el proyecto o servicio..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="total_hours" className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Horas Totales *
                  </label>
                  <input
                    type="number"
                    id="total_hours"
                    name="total_hours"
                    value={formData.total_hours}
                    onChange={handleInputChange}
                    required
                    step="0.5"
                    min="0"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Ejemplo: 120"
                  />
                </div>

                <div>
                  <label htmlFor="hourly_rate" className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Tarifa por Hora
                  </label>
                  <input
                    type="number"
                    id="hourly_rate"
                    name="hourly_rate"
                    value={formData.hourly_rate}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Ejemplo: 75.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Fecha de Inicio *
                  </label>
                  <input
                    type="date"
                    id="start_date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Fecha de Fin
                  </label>
                  <input
                    type="date"
                    id="end_date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Total calculation */}
              {formData.total_hours && formData.hourly_rate && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Valor Total del Contrato:</span>
                    <span className="text-xl font-bold text-blue-600">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              )}

              {/* Google Drive Integration */}
              <GoogleDrivePreview
                driveUrl={formData.google_drive_url}
                onUrlChange={(url) => setFormData(prev => ({ ...prev, google_drive_url: url }))}
                label="Contrato en Google Drive"
              />

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
                  {loading ? 'GUARDANDO...' : 'GUARDAR CONTRATO'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractModal;