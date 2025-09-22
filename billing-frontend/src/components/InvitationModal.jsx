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
          title: 'Creando usuario...',
          message: 'Configurando cuenta y permisos en el sistema.'
        };
      case 'success':
        return {
          title: '¡Usuario creado exitosamente!',
          message: `El usuario ${invitation?.full_name} ha sido creado y ya puede acceder al sistema.`
        };
      case 'error':
        return {
          title: 'Error al crear usuario',
          message: 'Ha ocurrido un problema durante la creación del usuario. Verifica los datos e intenta nuevamente.'
        };
      default:
        return {
          title: 'Crear Usuario',
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
                <h3 className="font-medium text-gray-900 mb-2">Detalles del usuario creado:</h3>
                <div className="text-sm text-gray-600 space-y-1 mb-4">
                  <p><strong>Usuario:</strong> {invitation.full_name}</p>
                  <p><strong>Email:</strong> {invitation.email}</p>
                  <p><strong>Rol:</strong> {invitation.role}</p>
                  {invitation.password && (
                    <p><strong>Contraseña:</strong> {invitation.password}</p>
                  )}
                </div>
                
                {invitation.instructions ? (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <h4 className="font-medium text-blue-900 mb-2">📧 Instrucciones:</h4>
                    <pre className="text-sm text-blue-800 whitespace-pre-wrap font-sans">
                      {invitation.instructions}
                    </pre>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <h4 className="font-medium text-green-900 mb-2">✅ Usuario listo para usar:</h4>
                    <p className="text-sm text-green-800">
                      El usuario ya puede iniciar sesión en el sistema con las credenciales mostradas arriba. 
                      Tiene acceso inmediato a todas las funciones según su rol asignado.
                    </p>
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