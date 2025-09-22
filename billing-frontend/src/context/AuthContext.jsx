import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { hasPermission, ROLES } from '../utils/roles';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  // Simple function to update user role from database (called after UI loads)
  const updateUserRole = async (userId) => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, full_name, is_active')
        .eq('id', userId)
        .single();

      if (profile && user) {
        console.log('🔄 Updating user role from database:', profile.role);
        setUser(prev => ({
          ...prev,
          role: profile.role,
          full_name: profile.full_name || prev.full_name,
          is_active: profile.is_active !== false
        }));
      }
    } catch (error) {
      console.log('Could not update role from database:', error.message);
    }
  };


  useEffect(() => {
    // Ultra-simple session check - no async/await to prevent hanging
    const checkSession = () => {
      console.log('🔄 Starting simple session check...');
      
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        console.log('📡 Session response received');
        
        if (error) {
          console.error('Error checking session:', error);
          setLoading(false);
          return;
        }
        
        setSession(session);
        
        if (session?.user) {
          console.log('👤 User found in session:', session.user.email);
          // Set user immediately with simple logic
          const simpleUser = {
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || session.user.email || 'Usuario',
            username: session.user.email?.split('@')[0] || 'user',
            role: session.user.email === 'evallejo@aplyca.com' ? 'admin' : 'collaborator',
            is_active: true,
            client_id: null
          };
          
          setUser(simpleUser);
          console.log('✅ User set immediately:', simpleUser);
          
          // Update role from database after UI loads
          setTimeout(() => {
            updateUserRole(session.user.id);
          }, 1000);
        }
        
        setLoading(false);
        console.log('✅ Loading completed');
      }).catch((error) => {
        console.error('Session check failed:', error);
        setLoading(false);
      });
    };

    checkSession();

    // Listen to auth changes - simplified
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
        // Set user immediately with simple logic
        const simpleUser = {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.email || 'Usuario',
          username: session.user.email?.split('@')[0] || 'user',
          role: session.user.email === 'evallejo@aplyca.com' ? 'admin' : 'collaborator',
          is_active: true,
          client_id: null
        };
        
        setUser(simpleUser);
        console.log('✅ User set on auth change:', simpleUser);
        
        // Update role from database after a delay
        setTimeout(() => {
          updateUserRole(session.user.id);
        }, 1000);
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