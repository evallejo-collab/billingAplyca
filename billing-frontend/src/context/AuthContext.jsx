import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3001/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(localStorage.getItem('sessionId'));

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const storedSessionId = localStorage.getItem('sessionId');
    const storedUser = localStorage.getItem('user');

    if (storedSessionId && storedUser) {
      try {
        const response = await axios.get(`${API_BASE_URL}/auth/me`, {
          headers: {
            'x-session-id': storedSessionId
          }
        });

        if (response.data.success) {
          setUser(response.data.user);
          setSessionId(storedSessionId);
        } else {
          clearAuthData();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        clearAuthData();
      }
    } else {
      clearAuthData();
    }
    
    setLoading(false);
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
        password
      });

      if (response.data.success) {
        const { user: userData, sessionId: newSessionId } = response.data;
        
        setUser(userData);
        setSessionId(newSessionId);
        
        localStorage.setItem('sessionId', newSessionId);
        localStorage.setItem('user', JSON.stringify(userData));
        
        return userData;
      } else {
        throw new Error(response.data.message || 'Error al iniciar sesión');
      }
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Error de conexión con el servidor');
    }
  };

  const logout = async () => {
    try {
      if (sessionId) {
        await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
          headers: {
            'x-session-id': sessionId
          }
        });
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      clearAuthData();
    }
  };

  const clearAuthData = () => {
    setUser(null);
    setSessionId(null);
    localStorage.removeItem('sessionId');
    localStorage.removeItem('user');
  };

  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  const isAuthenticated = () => {
    return !!user && !!sessionId;
  };

  const value = {
    user,
    sessionId,
    loading,
    login,
    logout,
    isAdmin,
    isAuthenticated,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

export default AuthContext;