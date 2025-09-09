import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { hasPermission, ROLES } from '../utils/roles';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Verificar sesión inicial
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error checking session:', error);
        }
        
        setSession(session);
        
        if (session?.user) {
          // Get user profile with role from database
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          setUser({
            id: session.user.id,
            email: session.user.email,
            full_name: profile?.full_name || session.user.user_metadata?.full_name || 'Usuario',
            username: session.user.email?.split('@')[0] || 'user',
            role: profile?.role || 'admin', // Default to admin if no profile exists
            is_active: profile?.is_active !== false,
            client_id: profile?.client_id || null
          });
        }
      } catch (error) {
        console.error('Error in checkSession:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      setSession(session);
      
      if (session?.user) {
        // Get user profile with role from database
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        setUser({
          id: session.user.id,
          email: session.user.email,
          full_name: profile?.full_name || session.user.user_metadata?.full_name || 'Usuario',
          username: session.user.email?.split('@')[0] || 'user',
          role: profile?.role || 'admin', // Default to admin if no profile exists
          is_active: profile?.is_active !== false,
          client_id: profile?.client_id || null
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