import { X, Folder, User, FileText, Clock, DollarSign, Calendar } from 'lucide-react';
import { formatCOP } from '../utils/currency';

const ProjectDetailsModal = ({ isOpen, onClose, project }) => {
  if (!isOpen || !project) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'No definida';
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { label: 'Activo', className: 'bg-green-100 text-green-800' },
      completed: { label: 'Completado', className: 'bg-blue-100 text-blue-800' },
      on_hold: { label: 'En Pausa', className: 'bg-yellow-100 text-yellow-800' },
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
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center">
            <Folder className="w-6 h-6 mr-3 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{project.name}</h2>
              <div className="flex items-center mt-1 space-x-2">
                {getStatusBadge(project.status)}
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  project.is_independent 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {project.is_independent ? 'Independiente' : 'De Contrato'}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Información del Proyecto</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-500">Descripción:</span>
                  <p className="text-sm text-gray-900">{project.description || 'Sin descripción'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Fecha de Inicio:</span>
                  <p className="text-sm text-gray-900">{formatDate(project.start_date)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Fecha de Fin:</span>
                  <p className="text-sm text-gray-900">{formatDate(project.end_date)}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Cliente</h3>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <User className="w-4 h-4 text-gray-400 mr-3" />
                  <span>{project.client_name || 'Cliente no especificado'}</span>
                </div>
                {project.client_email && (
                  <div className="text-sm text-gray-600">
                    Email: {project.client_email}
                  </div>
                )}
                {project.client_phone && (
                  <div className="text-sm text-gray-600">
                    Teléfono: {project.client_phone}
                  </div>
                )}
                {!project.is_independent && project.contract_number && (
                  <div className="flex items-center text-sm text-gray-600">
                    <FileText className="w-4 h-4 mr-2" />
                    Contrato: {project.contract_number}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Hours and Financial Info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen de Horas y Financiero</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {project.estimated_hours || 0}h
                </p>
                <p className="text-sm text-gray-600">Horas Estimadas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {project.used_hours || 0}h
                </p>
                <p className="text-sm text-gray-600">Horas Usadas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {project.remaining_hours || 0}h
                </p>
                <p className="text-sm text-gray-600">Horas Restantes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {project.entries_count || 0}
                </p>
                <p className="text-sm text-gray-600">Registros</p>
              </div>
            </div>
            
            {/* Financial Info */}
            <div className="mt-6 pt-6 border-t border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900">
                    {formatCOP(project.current_cost || 0)}
                  </p>
                  <p className="text-sm text-gray-600">Costo Actual</p>
                </div>
                {project.is_independent && project.total_amount && (
                  <div className="text-center">
                    <p className="text-xl font-bold text-green-600">
                      {formatCOP(project.total_amount)}
                    </p>
                    <p className="text-sm text-gray-600">Valor Total del Proyecto</p>
                  </div>
                )}
                {project.is_independent && project.hourly_rate && (
                  <div className="text-center">
                    <p className="text-lg font-medium text-gray-700">
                      {formatCOP(project.hourly_rate)}/h
                    </p>
                    <p className="text-sm text-gray-600">Tarifa por Hora</p>
                  </div>
                )}
                {project.is_independent && (
                  <div className="text-center">
                    <p className={`text-lg font-medium ${project.is_paid ? 'text-green-600' : 'text-red-600'}`}>
                      {project.is_paid ? 'Pagado' : 'Pendiente de Pago'}
                    </p>
                    <p className="text-sm text-gray-600">Estado de Pago</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment Information for Independent Projects */}
          {project.is_independent && project.is_paid && (
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Información de Pago</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {project.payment_date && (
                  <div>
                    <span className="text-gray-500">Fecha de Pago:</span>
                    <p className="font-medium">{formatDate(project.payment_date)}</p>
                  </div>
                )}
                {project.payment_method && (
                  <div>
                    <span className="text-gray-500">Método de Pago:</span>
                    <p className="font-medium">{project.payment_method}</p>
                  </div>
                )}
                {project.invoice_number && (
                  <div>
                    <span className="text-gray-500">Número de Factura:</span>
                    <p className="font-medium">{project.invoice_number}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {project.notes && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Notas</h3>
              <p className="text-sm text-gray-600">{project.notes}</p>
            </div>
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

export default ProjectDetailsModal;