import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { hasPermission, ROLES } from '../utils/roles';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Simple initial session check
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error checking session:', error);
          setLoading(false);
          return;
        }
        
        setSession(session);
        
        if (session?.user) {
          // Simple hardcoded role assignment to prevent loops
          setUser({
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || session.user.email || 'Usuario',
            username: session.user.email?.split('@')[0] || 'user',
            role: session.user.email === 'evallejo@aplyca.com' ? 'admin' : 'client',
            is_active: true,
            client_id: null
          });
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error in checkSession:', error);
        setLoading(false);
      }
    };

    checkSession();

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.email || 'Usuario',
          username: session.user.email?.split('@')[0] || 'user',
          role: session.user.email === 'evallejo@aplyca.com' ? 'admin' : 'client',
          is_active: true,
          client_id: null
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      
      return data.user;
    } catch (error) {
      throw new Error(error.message || 'Error al iniciar sesión');
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isAdmin = () => {
    return user && (user.role === ROLES.ADMIN || user.role === 'admin');
  };

  const isCollaborator = () => {
    return user && user.role === ROLES.COLLABORATOR;
  };

  const isClient = () => {
    return user && user.role === ROLES.CLIENT;
  };

  const isAuthenticated = () => {
    return !!user && !!session && user.is_active !== false;
  };

  const checkPermission = (permission) => {
    if (!user || user.is_active === false) return false;
    return hasPermission(user.role, permission);
  };

  const value = {
    user,
    session,
    loading,
    login,
    logout,
    isAdmin,
    isCollaborator,
    isClient,
    isAuthenticated,
    checkPermission
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