import { X, Folder, User, FileText, Clock, DollarSign, Calendar, CheckCircle, Target, Building, Calculator, CreditCard, AlertCircle } from 'lucide-react';
import { formatCOP } from '../utils/currency';

const ProjectDetailsModal = ({ isOpen, onClose, project }) => {
  if (!isOpen || !project) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'No definida';
    return new Date(dateString).toLocaleDateString('es-CO');
  };
  
  // Calculate dynamic payment status
  const calculatePaymentStatus = () => {
    if (!project.is_independent) return project.is_paid; // For contract projects, use existing logic
    
    const totalValue = project.total_amount || 0;
    const currentCost = project.current_cost || 0;
    
    if (totalValue === 0) return false;
    
    // Consider paid if current cost is >= total value (with small tolerance for floating point)
    return currentCost >= (totalValue - 0.01);
  };
  
  const isPaid = calculatePaymentStatus();

  const formatRichText = (text) => {
    if (!text) return text;
    
    // Procesar texto enriquecido paso a paso
    let processedText = text;
    
    // 1. Convertir saltos de línea
    processedText = processedText.split('\n').map((line, lineIndex) => (
      <span key={`line-${lineIndex}`}>
        {lineIndex > 0 && <br />}
        {processTextFormatting(line)}
      </span>
    ));
    
    return processedText;
  };
  
  const processTextFormatting = (text) => {
    const parts = [];
    let currentIndex = 0;
    
    // Regex para detectar diferentes formatos (incluye enlaces con formato [texto](url))
    const formatRegex = /(\*\*.*?\*\*)|(\*.*?\*)|(\[.*?\]\(.*?\))|(https?:\/\/[^\s]+)|(^• .*$)/gm;
    let match;
    
    while ((match = formatRegex.exec(text)) !== null) {
      // Agregar texto antes del formato
      if (match.index > currentIndex) {
        parts.push(text.slice(currentIndex, match.index));
      }
      
      const matchedText = match[0];
      
      if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
        // Texto en negritas
        parts.push(
          <strong key={`bold-${match.index}`} className="font-semibold">
            {matchedText.slice(2, -2)}
          </strong>
        );
      } else if (matchedText.startsWith('*') && matchedText.endsWith('*') && !matchedText.startsWith('**')) {
        // Texto en cursiva
        parts.push(
          <em key={`italic-${match.index}`} className="italic">
            {matchedText.slice(1, -1)}
          </em>
        );
      } else if (matchedText.startsWith('[') && matchedText.includes('](')) {
        // Enlaces con formato [texto](url)
        const linkMatch = matchedText.match(/\[(.*?)\]\((.*?)\)/);
        if (linkMatch) {
          const [, linkText, linkUrl] = linkMatch;
          parts.push(
            <a 
              key={`markdown-link-${match.index}`}
              href={linkUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {linkText}
            </a>
          );
        }
      } else if (matchedText.startsWith('http')) {
        // URLs simples
        parts.push(
          <a 
            key={`link-${match.index}`}
            href={matchedText} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {matchedText}
          </a>
        );
      } else if (matchedText.startsWith('• ')) {
        // Elementos de lista
        parts.push(
          <div key={`list-${match.index}`} className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            <span>{matchedText.slice(2)}</span>
          </div>
        );
      }
      
      currentIndex = match.index + matchedText.length;
    }
    
    // Agregar texto restante
    if (currentIndex < text.length) {
      parts.push(text.slice(currentIndex));
    }
    
    return parts.length > 0 ? parts : text;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { label: 'Activo', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
      completed: { label: 'Listo para facturar', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
      ready_to_invoice: { label: 'Pendiente facturar', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
      invoiced: { label: 'Facturado', className: 'bg-violet-50 text-violet-700 border border-violet-200' },
      on_hold: { label: 'En pausa', className: 'bg-slate-50 text-slate-700 border border-slate-200' },
      cancelled: { label: 'Cancelado', className: 'bg-red-50 text-red-700 border border-red-200' },
    };

    const config = statusConfig[status] || { 
      label: status?.charAt(0).toUpperCase() + status?.slice(1).toLowerCase() || 'Desconocido', 
      className: 'bg-gray-50 text-gray-700 border border-gray-200' 
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-700">{project.name}</h2>
              <div className="flex items-center mt-2 space-x-3">
                {getStatusBadge(project.status)}
                <span className="text-sm text-gray-600">
                  {project.is_independent ? 'Proyecto Independiente' : 'Proyecto de Contrato'}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Cliente</h3>
              <p className="text-gray-700">{project.client_name || 'Cliente no especificado'}</p>
              {!project.is_independent && project.contract_number && (
                <p className="text-sm text-gray-500 mt-1">Contrato: {project.contract_number}</p>
              )}
            </div>
            
            {project.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Descripción</h3>
                <div className="text-gray-700 text-sm space-y-1">{formatRichText(project.description)}</div>
              </div>
            )}
          </div>

          {/* Hours Progress Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Progreso de Horas</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Horas</p>
                <p className="text-base font-semibold text-gray-700 whitespace-nowrap">
                  {project.used_hours || 0}h / {project.estimated_hours || 0}h
                </p>
              </div>
              
              <div>
                <p className="text-xs text-gray-500 mb-1">Registros</p>
                <p className="text-lg font-semibold text-gray-700">{project.entries_count || 0}</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            {project.estimated_hours > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progreso</span>
                  <span>{Math.round(((project.used_hours || 0) / project.estimated_hours) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      ((project.used_hours || 0) / project.estimated_hours) >= 1
                        ? 'bg-red-500'
                        : ((project.used_hours || 0) / project.estimated_hours) >= 0.8
                        ? 'bg-blue-600'
                        : 'bg-blue-400'
                    }`}
                    style={{ width: `${Math.min(((project.used_hours || 0) / project.estimated_hours) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Financial Information - Only for independent projects */}
          {project.is_independent && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-700 mb-3">Información Financiera</h3>
              
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <div>
                  <p className="text-xs text-gray-500">Tarifa/Hora</p>
                  <p className="text-sm font-semibold text-gray-700">
                    {project.hourly_rate ? formatCOP(project.hourly_rate) : 'N/A'}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500">Valor Total</p>
                  <p className="text-sm font-semibold text-gray-700">
                    {project.total_amount ? formatCOP(project.total_amount) : 'N/A'}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500">Costo Actual</p>
                  <p className="text-sm font-semibold text-gray-700">
                    {formatCOP(project.current_cost || 0)}
                  </p>
                </div>
              </div>
              
              {/* Payment Status */}
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Estado de Pago</p>
                <p className={`text-sm font-semibold ${isPaid ? 'text-green-600' : 'text-blue-600'}`}>
                  {isPaid ? 'Proyecto Pagado' : 'Pendiente de Pago'}
                </p>
              </div>
            </div>
          )}

          {/* Timeline and Dates Section */}
          {(project.start_date || project.end_date || project.delivery_date) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-700 mb-3">Cronograma del Proyecto</h3>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                {project.start_date && (
                  <div>
                    <p className="text-xs text-gray-500">Inicio</p>
                    <p className="text-sm font-semibold text-gray-700">
                      {new Date(project.start_date).toLocaleDateString('es-CO', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                )}
                
                {project.delivery_date && (
                  <div>
                    <p className="text-xs text-gray-500">Entrega</p>
                    <p className="text-sm font-semibold text-gray-700">
                      {new Date(project.delivery_date).toLocaleDateString('es-CO', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                )}
                
                {project.end_date && (
                  <div>
                    <p className="text-xs text-gray-500">Finalización</p>
                    <p className="text-sm font-semibold text-gray-700">
                      {new Date(project.end_date).toLocaleDateString('es-CO', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {project.notes && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Notas del Proyecto</h3>
              <div className="text-sm text-gray-700 leading-relaxed space-y-1">{formatRichText(project.notes)}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button 
            onClick={onClose} 
            className="px-6 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsModal;