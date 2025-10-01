import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { hasPermission, ROLES } from '../utils/roles';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  // Function to get user profile from database and set user
  const updateUserRole = async (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('role, full_name, is_active')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Could not get user profile:', error.message);
          throw error;
        }

        if (profile) {
          
          // Get current session to build complete user object
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            const updatedUser = {
              id: session.user.id,
              email: session.user.email,
              full_name: profile.full_name || session.user.user_metadata?.full_name || session.user.email || 'Usuario',
              username: session.user.email?.split('@')[0] || 'user',
              role: profile.role,
              is_active: profile.is_active !== false,
              client_id: null  // Set to null as default
            };
            
            setUser(updatedUser);
            resolve(updatedUser);
          } else {
            reject(new Error('No session found'));
          }
        } else {
          reject(new Error('No profile found'));
        }
      } catch (error) {
        console.error('Error in updateUserRole:', error.message);
        reject(error);
      }
    });
  };


  useEffect(() => {
    const checkSession = () => {
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          console.error('Error checking session:', error);
          setLoading(false);
          return;
        }
        
        setSession(session);
        
        if (session?.user) {
          // Get role from database
          updateUserRole(session.user.id).then(() => {
            // Success - user updated with correct role
          }).catch((error) => {
            // Only use fallback if profile doesn't exist
            if (error.message.includes('No profile found') || error.message.includes('No rows returned')) {
              const fallbackUser = {
                id: session.user.id,
                email: session.user.email,
                full_name: session.user.user_metadata?.full_name || session.user.email || 'Usuario',
                username: session.user.email?.split('@')[0] || 'user',
                role: 'collaborator',
                is_active: true,
                client_id: null
              };
              
              setUser(fallbackUser);
            } else {
              console.error('Unexpected error in updateUserRole:', error);
            }
          });
        }
        
        setLoading(false);
      }).catch((error) => {
        console.error('Session check failed:', error);
        setLoading(false);
      });
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        return;
      }
      
      if (session?.user) {
        // Get role from database
        updateUserRole(session.user.id).then(() => {
          // Success - user updated with correct role
        }).catch((error) => {
          // Only use fallback if profile doesn't exist
          if (error.message.includes('No profile found') || error.message.includes('No rows returned')) {
            const fallbackUser = {
              id: session.user.id,
              email: session.user.email,
              full_name: session.user.user_metadata?.full_name || session.user.email || 'Usuario',
              username: session.user.email?.split('@')[0] || 'user',
              role: 'collaborator',
              is_active: true,
              client_id: null
            };
            
            setUser(fallbackUser);
          } else {
            console.error('Unexpected error in updateUserRole on auth change:', error);
          }
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
      // Clear state immediately
      setUser(null);
      setSession(null);
      setLoading(false);
      
      // Sign out from Supabase
      await supabase.auth.signOut({ scope: 'local' });
      
      // Clear Supabase storage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear session storage
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('sb-')) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
      
      // Reload page for clean state
      setTimeout(() => {
        window.location.reload();
      }, 100);
      
    } catch (error) {
      console.error('Logout error:', error);
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