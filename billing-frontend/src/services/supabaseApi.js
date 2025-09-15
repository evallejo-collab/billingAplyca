import { supabase } from '../config/supabase';

// ================ CLIENTS API ================
export const clientsApi = {
  async getAll() {
    try {
      // First get all clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (clientsError) throw clientsError;
      
      // Then get counts for each client
      const clientsWithCounts = await Promise.all(
        clients.map(async (client) => {
          try {
            // Get contracts count - try direct query first
            let contractsCount = 0;
            try {
              const { data: contracts, error: contractsError } = await supabase
                .from('contracts')
                .select('id')
                .eq('client_id', client.id);
              
              if (!contractsError && contracts) {
                contractsCount = contracts.length;
                console.log(`Client ${client.name} has ${contractsCount} contracts`);
              } else if (contractsError) {
                console.warn(`Contracts error for client ${client.id}:`, contractsError);
              }
            } catch (err) {
              console.warn(`Could not count contracts for client ${client.id}:`, err);
            }
            
            // Get projects count - try direct query first
            let projectsCount = 0;
            try {
              const { data: projects, error: projectsError } = await supabase
                .from('projects')
                .select('id')
                .eq('client_id', client.id);
              
              if (!projectsError && projects) {
                projectsCount = projects.length;
                console.log(`Client ${client.name} has ${projectsCount} projects`);
              } else if (projectsError) {
                console.warn(`Projects error for client ${client.id}:`, projectsError);
              }
            } catch (err) {
              console.warn(`Could not count projects for client ${client.id}:`, err);
            }
            
            return {
              ...client,
              contracts_count: contractsCount,
              projects_count: projectsCount
            };
          } catch (error) {
            console.error(`Error getting counts for client ${client.id}:`, error);
            return {
              ...client,
              contracts_count: 0,
              projects_count: 0
            };
          }
        })
      );
      
      return { success: true, data: clientsWithCounts };
    } catch (error) {
      console.error('Error in getAll:', error);
      throw error;
    }
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return { success: true, data };
  },

  async create(client) {
    const { data, error } = await supabase
      .from('clients')
      .insert([client])
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  },

  async update(id, client) {
    const { data, error } = await supabase
      .from('clients')
      .update(client)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  },

  async delete(id) {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  },

  async getSummary(clientId) {
    try {
      // Get client basic info
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
      
      if (clientError) {
        console.error('Client error:', clientError);
        return { data: { success: false, error: clientError.message } };
      }

      // Return basic client info with zero totals if tables don't exist
      const clientSummary = {
        ...client,
        total_contract_value: 0,
        total_project_value: 0,
        total_contract_billed: 0,
        total_project_billed: 0
      };

      return { data: { success: true, client: clientSummary } };
    } catch (error) {
      console.error('Error in getSummary:', error);
      return { data: { success: false, error: error.message } };
    }
  },

  async getContracts(clientId) {
    try {
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.warn('Contracts query error:', error);
        return { data: { success: true, contracts: [] } };
      }

      // Add basic calculations for each contract
      const contractsWithData = (contracts || []).map(contract => ({
        ...contract,
        used_hours: 0, // TODO: Calculate from time_entries
        remaining_hours: contract.total_hours || 0,
        total_amount: (contract.total_hours || 0) * (contract.hourly_rate || 0),
        entries_count: 0
      }));

      console.log(`Found ${contractsWithData.length} contracts for client ${clientId}`);
      return { data: { success: true, contracts: contractsWithData } };
    } catch (error) {
      console.error('Error in getContracts:', error);
      return { data: { success: true, contracts: [] } };
    }
  },

  async getProjects(clientId) {
    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.warn('Projects query error:', error);
        return { data: { success: true, projects: [] } };
      }

      // Add basic calculations for each project
      const projectsWithData = (projects || []).map(project => ({
        ...project,
        used_hours: 0, // TODO: Calculate from time_entries
        remaining_hours: project.estimated_hours || 0,
        current_cost: 0, // TODO: Calculate from time_entries
        entries_count: 0
      }));

      console.log(`Found ${projectsWithData.length} projects for client ${clientId}`);
      return { data: { success: true, projects: projectsWithData } };
    } catch (error) {
      console.error('Error in getProjects:', error);
      return { data: { success: true, projects: [] } };
    }
  }
};

// ================ PROJECTS API ================
export const projectsApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(name, email, company)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Calculate hours for each project with fresh data
    const projectsWithHours = await Promise.all(
      data.map(async (project) => {
        // Get total hours used from time_entries with fresh query
        const { data: timeEntries, error: timeEntriesError } = await supabase
          .from('time_entries')
          .select('hours_used')
          .eq('project_id', project.id);
        
        if (timeEntriesError) {
          console.error('Error fetching time entries for project:', project.id, timeEntriesError);
        }
        

        // Get total paid amount from payments
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('amount')
          .eq('project_id', project.id);
        
        if (paymentsError) {
          console.error('Error fetching payments for project:', project.id, paymentsError);
        }
        
        const usedHours = timeEntries?.reduce((sum, entry) => {
          // Use parseInt to match portal calculation
          return sum + parseInt(entry.hours_used || 0);
        }, 0) || 0;
        const paidAmount = payments?.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0) || 0;
        const estimatedHours = parseFloat(project.estimated_hours) || 0;
        const remainingHours = Math.max(0, estimatedHours - usedHours);
        const hourlyRate = parseFloat(project.hourly_rate) || 0;
        const totalAmount = project.total_amount && parseFloat(project.total_amount) > 0 
          ? parseFloat(project.total_amount) 
          : (estimatedHours * hourlyRate);
        
        console.log(`Project ${project.name}: total_amount=${project.total_amount}, estimated_hours=${estimatedHours}, hourly_rate=${hourlyRate}, calculated total=${totalAmount}`);
        
        return {
          ...project,
          client_name: project.client?.name || project.client?.company || 'Sin cliente',
          used_hours: usedHours,
          remaining_hours: remainingHours,
          entries_count: timeEntries?.length || 0,
          current_cost: usedHours * hourlyRate,
          total_amount: totalAmount,
          paid_amount: paidAmount
        };
      })
    );
    
    return { success: true, data: projectsWithHours };
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(name, email)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return { success: true, data };
  },

  async create(project) {
    const { data, error } = await supabase
      .from('projects')
      .insert([project])
      .select(`
        *,
        client:clients(name, email)
      `)
      .single();
    
    if (error) throw error;
    return { success: true, data };
  },

  async update(id, project) {
    const { data, error } = await supabase
      .from('projects')
      .update(project)
      .eq('id', id)
      .select(`
        *,
        client:clients(name, email)
      `)
      .single();
    
    if (error) throw error;
    return { success: true, data };
  },

  async delete(id) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  },

  async getByContract(contractId) {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(name, email, company)
      `)
      .eq('contract_id', contractId)
      .eq('is_independent', false)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Transform data to include client_name
    const transformedData = data.map(project => ({
      ...project,
      client_name: project.client?.company || project.client?.name || 'Sin cliente'
    }));
    
    return { success: true, data: transformedData };
  },

  async getIndependent() {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(name, email, company)
      `)
      .eq('is_independent', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Transform data to include client_name
    const transformedData = data.map(project => ({
      ...project,
      client_name: project.client?.company || project.client?.name || 'Sin cliente'
    }));
    
    return { success: true, data: transformedData };
  },

  async addPayment(projectId, paymentData) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('payments')
      .insert([{ 
        ...paymentData, 
        project_id: projectId,
        contract_id: null,
        created_by: user?.id 
      }])
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  }
};

// ================ CONTRACTS API ================
export const contractsApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('contracts')
      .select(`
        *,
        client:clients(name, email, company)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Calculate remaining hours and transform data
    const contractsWithHours = await Promise.all(
      data.map(async (contract) => {
        // Get total hours used from time_entries
        const { data: timeEntries, error: timeError } = await supabase
          .from('time_entries')
          .select('hours_used')
          .eq('contract_id', contract.id);
        
        console.log(`Contract ${contract.contract_number} (ID: ${contract.id}):`, {
          timeEntries,
          timeError,
          timeEntriesCount: timeEntries?.length || 0
        });
        
        const directHours = timeEntries?.reduce((sum, entry) => {
          // Use parseInt to match portal calculation
          const hours = parseInt(entry.hours_used || 0);
          console.log(`  - Entry hours: ${entry.hours_used} -> parsed: ${hours}`);
          return sum + hours;
        }, 0) || 0;
        
        // Get equivalent hours from support payments for this contract
        const { data: supportPayments } = await supabase
          .from('payments')
          .select('equivalent_hours')
          .eq('contract_id', contract.id)
          .in('payment_type', ['recurring_support', 'fixed'])
          .in('status', ['completed', 'pending', 'paid']);
        
        const equivalentHours = supportPayments?.reduce((sum, payment) => {
          return sum + (parseFloat(payment.equivalent_hours) || 0);
        }, 0) || 0;
        
        const totalEffectiveHours = directHours + equivalentHours;
        
        console.log(`  - Contract ${contract.contract_number}: Direct: ${directHours}h, Support: ${equivalentHours}h, Total: ${totalEffectiveHours}h`);
        
        const totalHours = parseFloat(contract.total_hours) || 0;
        const remainingHours = Math.max(0, totalHours - totalEffectiveHours);
        
        return {
          ...contract,
          client_name: contract.client?.name || contract.client?.company || 'Sin cliente',
          client_email: contract.client?.email || '',
          used_hours: totalEffectiveHours, // Total effective hours (direct + support)
          direct_hours: directHours, // Direct hours only
          equivalent_hours: equivalentHours, // Support hours only
          remaining_hours: remainingHours,
          entries_count: timeEntries?.length || 0
        };
      })
    );
    
    return { success: true, data: contractsWithHours };
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('contracts')
      .select(`
        *,
        client:clients(name, email)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return { success: true, data };
  },

  async create(contract) {
    const { data, error } = await supabase
      .from('contracts')
      .insert([contract])
      .select(`
        *,
        client:clients(name, email)
      `)
      .single();
    
    if (error) throw error;
    return { success: true, data };
  },

  async update(id, contract) {
    const { data, error } = await supabase
      .from('contracts')
      .update(contract)
      .eq('id', id)
      .select(`
        *,
        client:clients(name, email)
      `)
      .single();
    
    if (error) throw error;
    return { success: true, data };
  },

  async delete(id) {
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  },

  async addPayment(contractId, paymentData) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('payments')
      .insert([{ 
        ...paymentData, 
        contract_id: contractId,
        project_id: null,
        created_by: user?.id 
      }])
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  }
};

// ================ TIME ENTRIES API ================
export const timeEntriesApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        contract:contracts(contract_number, description, client:clients(name, company)),
        project:projects(name, client:clients(name, company))
      `)
      .order('entry_date', { ascending: false });
    
    if (error) throw error;
    
    // Get user profiles separately
    const userIds = [...new Set(data.map(entry => entry.created_by).filter(Boolean))];
    let userProfiles = {};
    
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name, username')
        .in('id', userIds);
      
      if (!profilesError && profiles) {
        userProfiles = profiles.reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
      }
    }
    
    // Transform data to flatten embedded fields for backward compatibility
    const transformedData = data.map(entry => {
      const userProfile = userProfiles[entry.created_by];
      return {
        ...entry,
        contract_number: entry.contract?.contract_number || null,
        contract_description: entry.contract?.description || null,
        client_name: entry.contract?.client?.name || entry.contract?.client?.company || 
                     entry.project?.client?.name || entry.project?.client?.company || 'Sin cliente',
        project_name: entry.project?.name || null,
        created_by: userProfile?.full_name || userProfile?.username || 'Usuario desconocido'
      };
    });
    
    return { success: true, data: transformedData };
  },

  async getByContractId(contractId) {
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        contract:contracts(contract_number, description)
      `)
      .eq('contract_id', contractId)
      .order('entry_date', { ascending: false });
    
    if (error) throw error;
    return { success: true, data };
  },

  async create(timeEntry) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('time_entries')
      .insert([{ ...timeEntry, created_by: user?.id }])
      .select(`
        *,
        contract:contracts(contract_number, description)
      `)
      .single();
    
    if (error) throw error;
    return { success: true, data };
  },

  async update(id, timeEntry) {
    // Don't overwrite created_by with user ID, keep it as the full name if provided
    const updateData = { ...timeEntry };
    
    const { data, error } = await supabase
      .from('time_entries')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        contract:contracts(contract_number, description),
        project:projects(name, client:clients(name, company))
      `)
      .single();
    
    if (error) throw error;
    return { success: true, data };
  },

  async delete(id) {
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  }
};

// ================ PAYMENTS API ================
export const paymentsApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        contract:contracts(contract_number, description),
        project:projects(name)
      `)
      .order('payment_date', { ascending: false });
    
    if (error) throw error;
    return { success: true, data };
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        contract:contracts(contract_number, description),
        project:projects(name)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return { success: true, data };
  },

  async create(payment) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('payments')
      .insert([{ ...payment, created_by: user?.id }])
      .select(`
        *,
        contract:contracts(contract_number, description),
        project:projects(name)
      `)
      .single();
    
    if (error) throw error;
    return { success: true, data };
  },

  async update(id, payment) {
    const { data, error } = await supabase
      .from('payments')
      .update(payment)
      .eq('id', id)
      .select(`
        *,
        contract:contracts(contract_number, description),
        project:projects(name)
      `)
      .single();
    
    if (error) throw error;
    return { success: true, data };
  },

  async delete(id) {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  },

  async getByContract(contractId) {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        contract:contracts(contract_number, description),
        project:projects(name)
      `)
      .eq('contract_id', contractId)
      .order('payment_date', { ascending: false });
    
    if (error) throw error;
    return { success: true, data };
  },

  async getByProject(projectId) {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        contract:contracts(contract_number, description),
        project:projects(name)
      `)
      .eq('project_id', projectId)
      .order('payment_date', { ascending: false });
    
    if (error) throw error;
    return { success: true, data };
  }
};

// ================ USERS API ================
export const usersApi = {
  async getAll() {
    console.log('usersApi.getAll() called');
    
    try {
      // Get current authenticated user (this is all we can get from frontend)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting current user:', userError);
        return { success: true, data: [] };
      }
      
      if (user) {
        console.log('Returning current authenticated user from Auth');
        const currentUser = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
          username: user.email?.split('@')[0],
          role: user.user_metadata?.role || 'user',
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at
        };
        return { success: true, data: [currentUser] };
      }
      
      return { success: true, data: [] };
    } catch (err) {
      console.error('Error in usersApi.getAll():', err);
      return { success: true, data: [] };
    }
  },

  async create(userData) {
    // This function is for creating user profiles manually
    // The actual user creation happens in the UserModal component
    const { data, error } = await supabase
      .from('user_profiles')
      .insert([userData])
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  },

  async updateProfile(id, profile) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(profile)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  },

  async delete(id) {
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  }
};

// ================ UTILITY FUNCTIONS ================
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP'
  }).format(amount);
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('es-ES');
};