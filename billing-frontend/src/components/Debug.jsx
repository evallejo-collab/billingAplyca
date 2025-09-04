import { useState, useEffect } from 'react';
import { clientsApi } from '../services/api';

const Debug = () => {
  const [apiStatus, setApiStatus] = useState('Checking...');
  const [clients, setClients] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    testAPI();
  }, []);

  const testAPI = async () => {
    try {
      console.log('Testing API connection...');
      const response = await clientsApi.getAll();
      console.log('API Response:', response);
      
      if (response.data.success) {
        setClients(response.data.clients);
        setApiStatus(`✅ API Working - ${response.data.clients.length} clients loaded`);
      } else {
        setApiStatus(`❌ API Error: ${response.data.message}`);
      }
    } catch (err) {
      console.error('API Error:', err);
      setError(err.message);
      setApiStatus(`❌ Connection Error: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">🔧 Sistema de Facturación - Debug</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">🌐 Estado de la API</h2>
          <p className="text-sm">{apiStatus}</p>
          {error && (
            <div className="mt-2 p-2 bg-red-100 text-red-700 rounded text-xs">
              Error: {error}
            </div>
          )}
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">📊 URLs de Desarrollo</h2>
          <div className="text-sm space-y-1">
            <p><strong>Frontend:</strong> http://localhost:3000</p>
            <p><strong>API:</strong> http://localhost:3001</p>
            <p><strong>Clientes:</strong> /api/clients</p>
            <p><strong>Contratos:</strong> /api/contracts</p>
            <p><strong>Proyectos:</strong> /api/projects</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">👥 Clientes Cargados ({clients.length})</h2>
        {clients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map(client => (
              <div key={client.id} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-blue-600">{client.name}</h3>
                <p className="text-sm text-gray-600">{client.email}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {client.contracts_count} contratos • {client.projects_count} proyectos
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            {apiStatus.includes('Working') ? 'No hay clientes disponibles' : 'Esperando datos de la API...'}
          </p>
        )}
      </div>

      <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">🚀 Siguiente Paso</h3>
        <p className="text-sm text-yellow-700">
          Si ves los clientes arriba, la API está funcionando correctamente. 
          Puedes navegar a las diferentes secciones del sistema usando los enlaces de navegación.
        </p>
      </div>

      <div className="mt-4 flex gap-4 flex-wrap">
        <button 
          onClick={testAPI}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
        >
          🔄 Reprobar API
        </button>
        
        <button 
          onClick={() => window.location.href = '/clients'}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
        >
          👥 Ir a Clientes
        </button>
        
        <button 
          onClick={() => window.location.href = '/projects'}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm"
        >
          📁 Ir a Proyectos
        </button>
      </div>
    </div>
  );
};

export default Debug;