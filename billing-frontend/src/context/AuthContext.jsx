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
      console.log('🔄 Auth state change:', event, session ? 'has session' : 'no session');
      
      setSession(session);
      
      if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        setUser(null);
        setSession(null);
        return;
      }
      
      if (session?.user) {
        console.log('👤 User signed in:', session.user.email);
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
        console.log('❌ No session');
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
      console.log('🔄 Starting logout process...');
      
      // Clear state immediately to prevent any UI flicker
      setUser(null);
      setSession(null);
      setLoading(false);
      
      // Sign out from Supabase with scope 'local' to clear all storage
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        console.error('Supabase signOut error:', error);
      }
      
      // Additional cleanup - clear all Supabase related localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => {
        console.log('🧹 Clearing localStorage key:', key);
        localStorage.removeItem(key);
      });
      
      // Also clear session storage
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('sb-')) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(key => {
        console.log('🧹 Clearing sessionStorage key:', key);
        sessionStorage.removeItem(key);
      });
      
      console.log('✅ Logout completed - all storage cleared');
      
      // Force a page reload to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 100);
      
    } catch (error) {
      console.error('Logout error:', error);
      // Even if everything fails, clear state and reload
      setUser(null);
      setSession(null);
      setLoading(false);
      window.location.reload();
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