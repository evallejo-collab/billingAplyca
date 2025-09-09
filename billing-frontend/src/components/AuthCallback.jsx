import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';

const AuthCallback = () => {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          setMessage('Error al procesar la confirmación: ' + error.message);
          setLoading(false);
          return;
        }

        if (data.session) {
          setMessage('¡Cuenta confirmada exitosamente! Redirigiendo...');
          setTimeout(() => {
            navigate('/');
          }, 2000);
        } else {
          setMessage('Sesión no encontrada. Por favor, intenta iniciar sesión.');
          setTimeout(() => {
            navigate('/');
          }, 3000);
        }
      } catch (err) {
        setMessage('Error inesperado: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Confirmando cuenta...
              </h2>
              <p className="text-gray-600">
                Por favor espera mientras procesamos tu confirmación.
              </p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Confirmación de Cuenta
              </h2>
              <p className="text-gray-600">
                {message}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;