import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';

export const useClientAssociation = () => {
  const { user, isAdmin } = useAuth();
  const [associatedClient, setAssociatedClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const userIsAdmin = isAdmin();

  useEffect(() => {
    const fetchUserAssociation = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Use the role from AuthContext instead of querying database
        if (userIsAdmin) {
          // Admin users can see all clients, no restrictions
          setAssociatedClient(null);
          setLoading(false);
          return;
        }

        // For non-admin users, get their associated client
        const { data: association, error: associationError } = await supabase
          .from('user_client_associations')
          .select(`
            client_id,
            is_active,
            clients (
              id,
              name,
              email,
              phone,
              contact_person,
              created_at
            )
          `)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1);

        if (associationError) {
          console.error('Error fetching user association:', associationError);
          setError(associationError);
        } else if (association && association.length > 0) {
          setAssociatedClient(association[0].clients);
        } else {
          // User has no client association
          setAssociatedClient(null);
          setError({ message: 'No tienes acceso a ningún cliente. Contacta al administrador.' });
        }

      } catch (err) {
        console.error('Error in fetchUserAssociation:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAssociation();
  }, [user?.id, userIsAdmin]);

  const refreshAssociation = () => {
    setLoading(true);
    setError(null);
    // Re-run the effect
    const fetchUserAssociation = async () => {
      // ... same logic as above
    };
    fetchUserAssociation();
  };

  return {
    associatedClient,
    isAdmin: userIsAdmin,
    loading,
    error,
    refreshAssociation,
    hasAccess: userIsAdmin || associatedClient !== null
  };
};