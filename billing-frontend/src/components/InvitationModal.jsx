import { CheckCircle, Mail, Clock, AlertCircle } from 'lucide-react';

const InvitationModal = ({ isOpen, onClose, invitation, status }) => {
  if (!isOpen) return null;

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-600" />;
      default:
        return <Mail className="w-8 h-8 text-blue-600" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'loading':
        return {
          title: 'Enviando invitación...',
          message: 'Creando cuenta y enviando email de confirmación.'
        };
      case 'success':
        return {
          title: '¡Invitación enviada!',
          message: `Se ha enviado un email de confirmación a ${invitation?.email}. El usuario recibirá instrucciones para activar su cuenta.`
        };
      case 'error':
        return {
          title: 'Error al enviar invitación',
          message: 'Ha ocurrido un problema. La invitación se guardó pero el email podría no haberse enviado.'
        };
      default:
        return {
          title: 'Invitación',
          message: ''
        };
    }
  };

  const statusInfo = getStatusMessage();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4">
              {getStatusIcon()}
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {statusInfo.title}
            </h2>
            
            <p className="text-gray-600 mb-4">
              {statusInfo.message}
            </p>

            {invitation && status === 'success' && (
              <div className="bg-gray-50 rounded-lg p-4 w-full mb-4 text-left">
                <h3 className="font-medium text-gray-900 mb-2">Detalles de la invitación:</h3>
                <div className="text-sm text-gray-600 space-y-1 mb-4">
                  <p><strong>Usuario:</strong> {invitation.full_name}</p>
                  <p><strong>Email:</strong> {invitation.email}</p>
                  <p><strong>Rol:</strong> {invitation.role}</p>
                </div>
                
                {invitation.instructions && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <h4 className="font-medium text-blue-900 mb-2">📧 Siguientes pasos:</h4>
                    <pre className="text-sm text-blue-800 whitespace-pre-wrap font-sans">
                      {invitation.instructions}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div className="flex space-x-3">
              {status !== 'loading' && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Entendido
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvitationModal;