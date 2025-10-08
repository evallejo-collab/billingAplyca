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

      return { data: { success: true, projects: projectsWithData } };
    } catch (error) {
      console.error('Error in getProjects:', error);
      return { data: { success: true, projects: [] } };
    }
  }
};

// ================ HELPER FUNCTIONS ================
const updateProjectPaymentStatus = async (projectId) => {
  try {
    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('total_amount, hourly_rate, estimated_hours, is_paid')
      .eq('id', projectId)
      .single();
    
    if (projectError) throw projectError;
    
    // Calculate total project value
    const totalProjectValue = parseFloat(project.total_amount) || 
      ((parseFloat(project.hourly_rate) || 0) * (parseFloat(project.estimated_hours) || 0));
    
    // Get sum of all payments for this project
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .eq('project_id', projectId);
    
    if (paymentsError) throw paymentsError;
    
    const totalPaidAmount = payments?.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0) || 0;
    
    // Determine if project is fully paid (with small tolerance for floating point precision)
    const isPaid = totalProjectValue > 0 && totalPaidAmount >= (totalProjectValue - 0.01);
    
    // Update project if payment status changed
    if (project.is_paid !== isPaid) {
      const { error: updateError } = await supabase
        .from('projects')
        .update({ is_paid: isPaid })
        .eq('id', projectId);
      
      if (updateError) throw updateError;
    }
    
    return isPaid;
  } catch (error) {
    console.error('Error updating project payment status:', error);
    // Don't throw error to avoid breaking payment operations
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
        
        
        return {
          ...project,
          client_name: project.client?.name || project.client?.company || 'Sin cliente',
          used_hours: usedHours,
          remaining_hours: remainingHours,
          entries_count: timeEntries?.length || 0,
          current_cost: paidAmount, // Current cost should be the amount paid, not hours * rate
          hours_cost: usedHours * hourlyRate, // Separate field for hours-based cost
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
    
    if (error) {
      console.error('🚨 PROJECTS API CREATE ERROR:', error);
      throw error;
    }
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
    
    const insertData = { 
      ...paymentData, 
      project_id: projectId,
      created_by: user?.id 
    };
    
    
    const { data, error } = await supabase
      .from('payments')
      .insert([insertData])
      .select()
      .single();
    
    if (error) {
      console.error('projectsApi.addPayment - Database error:', error);
      throw error;
    }
    
    // Update project payment status after adding payment
    await updateProjectPaymentStatus(projectId);
    
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
        // Get all projects associated with this contract first
        const { data: contractProjects, error: projectsError } = await supabase
          .from('projects')
          .select('id')
          .eq('contract_id', contract.id)
          .eq('is_independent', false);
        
        if (projectsError) {
          console.error('Error fetching contract projects:', projectsError);
        }
        
        const projectIds = contractProjects?.map(p => p.id) || [];
        
        // Get total hours used from time_entries for projects in this contract
        let timeEntries = [];
        let timeError = null;
        
        if (projectIds.length > 0) {
          const { data: entries, error: entriesError } = await supabase
            .from('time_entries')
            .select('hours_used')
            .in('project_id', projectIds);
          
          timeEntries = entries;
          timeError = entriesError;
        }
        
        
        const directHours = timeEntries?.reduce((sum, entry) => {
          // Use parseInt to match portal calculation
          const hours = parseInt(entry.hours_used || 0);
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
        client:clients(name, email, company)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // Get all projects associated with this contract first
    const { data: contractProjects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('contract_id', id)
      .eq('is_independent', false);
    
    if (projectsError) {
      console.error('Error fetching contract projects:', projectsError);
    }
    
    const projectIds = contractProjects?.map(p => p.id) || [];
    
    // Get total hours used from time_entries for projects in this contract
    let timeEntries = [];
    
    if (projectIds.length > 0) {
      const { data: entries, error: entriesError } = await supabase
        .from('time_entries')
        .select('hours_used')
        .in('project_id', projectIds);
      
      if (entriesError) {
        console.error('Error fetching time entries:', entriesError);
      } else {
        timeEntries = entries;
      }
    }
    
    const totalUsedHours = timeEntries?.reduce((sum, entry) => sum + (parseFloat(entry.hours_used) || 0), 0) || 0;
    
    return { 
      success: true, 
      data: {
        ...data,
        used_hours: totalUsedHours,
        client_name: data.client?.name || data.client?.company || 'Cliente desconocido'
      }
    };
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
        created_by: user?.id 
      }])
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  }
};

// Helper function to ensure user has a profile
const ensureUserProfile = async (userId, userEmail, userMetadata = {}) => {
  if (!userId) return null;
  
  try {
    // Check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (!checkError && existingProfile) {
      return existingProfile;
    }
    
    // Create profile if it doesn't exist
    const profileData = {
      id: userId,
      username: userEmail?.split('@')[0] || `user_${userId.substring(0, 8)}`,
      full_name: userMetadata?.full_name || userEmail?.split('@')[0] || `Usuario ${userId.substring(0, 8)}`,
      email: userEmail
    };
    
    const { data: newProfile, error: insertError } = await supabase
      .from('user_profiles')
      .insert(profileData)
      .select()
      .single();
    
    if (!insertError) {
      return newProfile;
    }
  } catch (error) {
    console.log('Could not ensure user profile:', error.message);
  }
  
  return null;
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
    
    // Get current user info
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    // Get user profiles separately
    const userIds = [...new Set(data.map(entry => entry.created_by).filter(Boolean))];
    let userProfiles = {};
    
    if (userIds.length > 0) {
      // Try to get profiles from user_profiles table
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

      // For current user, ensure they have a profile and use their information if not found
      if (currentUser && userIds.includes(currentUser.id) && !userProfiles[currentUser.id]) {
        console.log('Creating profile for current user:', currentUser.email);
        const userProfile = await ensureUserProfile(currentUser.id, currentUser.email, currentUser.user_metadata);
        if (userProfile) {
          userProfiles[currentUser.id] = userProfile;
          console.log('Profile created successfully:', userProfile);
        } else {
          userProfiles[currentUser.id] = {
            id: currentUser.id,
            full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Usuario Actual',
            username: currentUser.email?.split('@')[0] || 'Usuario Actual'
          };
        }
      }
      
      // For any missing users, try to create profiles if we can identify them
      for (const userId of userIds) {
        if (!userProfiles[userId]) {
          // Try to get any existing user info and create a profile
          const defaultProfile = await ensureUserProfile(userId, null, {});
          if (defaultProfile) {
            userProfiles[userId] = defaultProfile;
          }
        }
      }
    }
    
    // Transform data to flatten embedded fields for backward compatibility
    const transformedData = data.map(entry => {
      const userProfile = userProfiles[entry.created_by];
      let createdByDisplay = 'Usuario desconocido';
      
      if (userProfile) {
        createdByDisplay = userProfile.full_name || userProfile.username;
      } else if (entry.created_by) {
        // If we have a created_by value but no profile, try to create a friendly name
        if (entry.created_by.includes('@')) {
          // If it looks like an email, use the part before @
          createdByDisplay = entry.created_by.split('@')[0];
        } else if (entry.created_by.length > 20) {
          // If it looks like a UUID, check if it's the current user
          if (currentUser && entry.created_by === currentUser.id) {
            createdByDisplay = currentUser.email?.split('@')[0] || 'Tú';
          } else {
            createdByDisplay = `Usuario Administrador`;
          }
        } else {
          // If it's a short string, use it as is
          createdByDisplay = entry.created_by;
        }
      }
      
      return {
        ...entry,
        contract_number: entry.contract?.contract_number || null,
        contract_description: entry.contract?.description || null,
        client_name: entry.contract?.client?.name || entry.contract?.client?.company || 
                     entry.project?.client?.name || entry.project?.client?.company || 'Sin cliente',
        project_name: entry.project?.name || null,
        created_by: createdByDisplay
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
    
    // Remove null contract_id for independent projects to avoid NOT NULL constraint
    const paymentData = { ...payment, created_by: user?.id };
    if (paymentData.contract_id === null || paymentData.contract_id === undefined) {
      delete paymentData.contract_id;
    }
    
    const { data, error } = await supabase
      .from('payments')
      .insert([paymentData])
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
    // Get the payment to find which project/contract it belongs to
    const { data: existingPayment, error: getError } = await supabase
      .from('payments')
      .select('project_id, contract_id')
      .eq('id', id)
      .single();
    
    if (getError) throw getError;
    
    // Remove null contract_id for independent projects to avoid NOT NULL constraint
    const paymentData = { ...payment };
    if (paymentData.contract_id === null || paymentData.contract_id === undefined) {
      delete paymentData.contract_id;
    }
    
    const { data, error } = await supabase
      .from('payments')
      .update(paymentData)
      .eq('id', id)
      .select(`
        *,
        contract:contracts(contract_number, description),
        project:projects(name)
      `)
      .single();
    
    if (error) throw error;
    
    // Update project payment status if this is a project payment
    if (existingPayment.project_id) {
      await updateProjectPaymentStatus(existingPayment.project_id);
    }
    
    return { success: true, data };
  },

  async delete(id) {
    // Get the payment to find which project it belongs to before deleting
    const { data: existingPayment, error: getError } = await supabase
      .from('payments')
      .select('project_id, contract_id')
      .eq('id', id)
      .single();
    
    if (getError) throw getError;
    
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    // Update project payment status if this was a project payment
    if (existingPayment.project_id) {
      await updateProjectPaymentStatus(existingPayment.project_id);
    }
    
    return { success: true };
  },

  async getByContract(contractId) {
    // Validate contractId to prevent undefined queries
    if (!contractId || contractId === undefined || contractId === 'undefined') {
      console.warn('paymentsApi.getByContract called with invalid contractId:', contractId);
      return { success: true, data: [] };
    }
    
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
    // Validate projectId to prevent undefined queries
    if (!projectId || projectId === undefined || projectId === 'undefined') {
      console.warn('paymentsApi.getByProject called with invalid projectId:', projectId);
      return { success: true, data: [] };
    }
    
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
    
    try {
      // Get current authenticated user (this is all we can get from frontend)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting current user:', userError);
        return { success: true, data: [] };
      }
      
      if (user) {
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

// ================ CAPACITY COORDINATION API ================
export const capacityApi = {
  // ================ TEAM MEMBERS ================
  async getAllTeamMembers() {
    // Forzar una consulta fresca sin cache
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('Error loading team members:', error);
      throw error;
    }
    
    console.log('Active team members loaded:', data?.length || 0, 'members');
    console.log('Team members data:', data);
    
    return { success: true, data: data || [] };
  },

  async getTeamMemberById(id) {
    console.log('Getting team member by ID:', id);
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', id)
      .single();
    
    console.log('Team member by ID result:', { data, error });
    
    if (error) throw error;
    return { success: true, data };
  },

  async createTeamMember(member) {
    try {
      // Limpiar campos vacíos y preparar datos
      const cleanMember = {
        ...member,
        email: member.email && member.email.trim() !== '' ? member.email.trim() : null,
        hire_date: member.hire_date && member.hire_date !== '' ? member.hire_date : null,
        notes: member.notes && member.notes.trim() !== '' ? member.notes.trim() : null,
        hourly_rate: parseFloat(member.hourly_rate) || 0,
        weekly_capacity: parseInt(member.weekly_capacity) || 40,
        skills: Array.isArray(member.skills) ? member.skills : []
      };

      const { data, error } = await supabase
        .from('team_members')
        .insert([cleanMember])
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating team member:', error);
      throw error;
    }
  },

  async updateTeamMember(id, member) {
    try {
      // Limpiar campos vacíos y preparar datos
      const cleanMember = {
        name: member.name?.trim() || '',
        email: member.email?.trim() || null,
        role: member.role || 'Developer',
        weekly_capacity: parseInt(member.weekly_capacity) || 40,
        hourly_rate: parseFloat(member.hourly_rate) || 0,
        department: member.department || 'Development',
        hire_date: member.hire_date || null,
        skills: Array.isArray(member.skills) ? member.skills : [],
        notes: member.notes?.trim() || null
      };

      console.log('Updating team member:', { id, cleanMember });

      // Primero verificar que el miembro existe
      const { data: existingMember, error: checkError } = await supabase
        .from('team_members')
        .select('*')
        .eq('id', id)
        .single();

      if (checkError || !existingMember) {
        console.error('Member not found:', { id, checkError });
        throw new Error(`Miembro con ID ${id} no encontrado`);
      }

      console.log('Found existing member:', existingMember);

      // Actualizar el miembro sin .select() para evitar problemas de permisos
      const { error: updateError } = await supabase
        .from('team_members')
        .update(cleanMember)
        .eq('id', id);
      
      console.log('Update result:', { updateError });

      if (updateError) {
        console.error('Error updating member:', updateError);
        throw new Error(`Error actualizando miembro: ${updateError.message}`);
      }
      
      // Obtener el miembro actualizado en una consulta separada
      const { data: updatedMember, error: fetchError } = await supabase
        .from('team_members')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !updatedMember) {
        console.error('Error fetching updated member:', fetchError);
        throw new Error('No se pudo obtener el miembro actualizado');
      }
      
      console.log('Member updated and fetched successfully:', updatedMember);
      return { success: true, data: updatedMember };
    } catch (error) {
      console.error('Error updating team member:', error);
      throw error;
    }
  },

  async deleteTeamMember(id) {
    try {
      console.log('Deleting team member:', id);

      // Soft delete - marcar como inactivo
      const { data, error } = await supabase
        .from('team_members')
        .update({ is_active: false })
        .eq('id', id)
        .select();
      
      if (error) {
        console.error('Error deleting member:', error);
        throw new Error(`Error eliminando miembro: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        throw new Error('No se encontró el miembro para eliminar');
      }
      
      // Tomar el primer elemento del array de resultados
      const deletedMember = Array.isArray(data) ? data[0] : data;
      console.log('Member deleted successfully:', deletedMember);
      return { success: true, data: deletedMember };
    } catch (error) {
      console.error('Error deleting team member:', error);
      throw error;
    }
  },

  // ================ CAPACITY ASSIGNMENTS ================
  async getAssignmentsByWeek(weekStartDate) {
    try {
      // Obtener asignaciones básicas sin joins
      const { data: assignments, error: assignmentsError } = await supabase
        .from('capacity_assignments')
        .select('*')
        .eq('week_start_date', weekStartDate)
        .order('member_id');

      if (assignmentsError) throw assignmentsError;
      if (!assignments || assignments.length === 0) {
        return { success: true, data: [] };
      }

      // Obtener IDs únicos para hacer queries separadas
      const projectIds = [...new Set(assignments.map(a => a.project_id))];
      const memberIds = [...new Set(assignments.map(a => a.member_id))];

      // Obtener proyectos con sus clientes
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, client_id, clients(name)')
        .in('id', projectIds);

      if (projectsError) throw projectsError;

      // Obtener miembros
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('id, name, weekly_capacity, department')
        .in('id', memberIds);

      if (membersError) throw membersError;

      // Combinar los datos
      const enrichedAssignments = assignments.map(assignment => {
        const project = projects.find(p => p.id === assignment.project_id);
        const member = members.find(m => m.id === assignment.member_id);
        
        return {
          ...assignment,
          project: project ? {
            id: project.id,
            name: project.name,
            client: project.clients ? { name: project.clients.name } : null
          } : null,
          member: member ? {
            id: member.id,
            name: member.name,
            weekly_capacity: member.weekly_capacity,
            department: member.department
          } : null
        };
      });

      return { success: true, data: enrichedAssignments };
    } catch (error) {
      console.error('Error in getAssignmentsByWeek:', error);
      throw error;
    }
  },

  async createAssignment(assignment) {
    // Validar disponibilidad antes de crear
    const availability = await this.checkMemberAvailability(
      assignment.member_id, 
      assignment.week_start_date
    );
    
    if (!availability.success) {
      throw new Error(availability.error);
    }

    // Limpiar campos UUID vacíos
    const cleanAssignment = {
      ...assignment,
      project_id: parseInt(assignment.project_id),
    };

    const { data, error } = await supabase
      .from('capacity_assignments')
      .insert([cleanAssignment])
      .select('id')
      .single();
    
    if (error) throw error;
    return { success: true, data };
  },

  async updateAssignment(id, assignment) {
    console.log('updateAssignment called with:', { id, assignment });
    
    try {
      // Solo actualizar las columnas que sabemos que existen
      const updateData = {};
      
      if (assignment.project_id !== undefined) {
        updateData.project_id = parseInt(assignment.project_id);
      }
      if (assignment.assigned_hours !== undefined) {
        updateData.assigned_hours = assignment.assigned_hours;
      }
      if (assignment.assignment_type !== undefined) {
        updateData.assignment_type = assignment.assignment_type;
      }
      if (assignment.priority !== undefined) {
        updateData.priority = assignment.priority;
      }
      if (assignment.is_billable !== undefined) {
        updateData.is_billable = assignment.is_billable;
      }
      if (assignment.notes !== undefined) {
        updateData.notes = assignment.notes;
      }
      if (assignment.week_start_date !== undefined) {
        updateData.week_start_date = assignment.week_start_date;
      }
      if (assignment.member_id !== undefined) {
        updateData.member_id = assignment.member_id;
      }
      
      console.log('Filtered update data:', updateData);
      
      const { error } = await supabase
        .from('capacity_assignments')
        .update(updateData)
        .eq('id', id);
      
      console.log('Basic update result:', { error });
      
      if (error) {
        console.error('Basic update failed:', error);
        throw error;
      }
      
      return { success: true, data: { id, ...updateData } };
    } catch (error) {
      console.error('updateAssignment complete failure:', error);
      throw error;
    }
  },

  async deleteAssignment(id) {
    const { error } = await supabase
      .from('capacity_assignments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  },

  // ================ BULK OPERATIONS ================
  async bulkCreateAssignments(assignments) {
    // Limpiar campos UUID vacíos en todas las asignaciones
    const cleanAssignments = assignments.map(assignment => ({
      ...assignment,
      project_id: parseInt(assignment.project_id),
      leader_id: assignment.leader_id && assignment.leader_id.trim() !== '' ? assignment.leader_id : null
    }));

    const { data, error } = await supabase
      .from('capacity_assignments')
      .insert(cleanAssignments)
      .select(`
        *,
        project:projects(id, name, client:clients(name)),
        member:team_members!member_id(id, name, weekly_capacity)
      `);
    
    if (error) throw error;
    return { success: true, data };
  },

  async copyWeekAssignments(sourceWeek, targetWeek, projectIds = null) {
    try {
      // Convertir projectIds a integers si se proporciona
      const intProjectIds = projectIds ? projectIds.map(id => parseInt(id)) : null;
      
      const { data, error } = await supabase.rpc('copy_week_assignments', {
        p_source_week: sourceWeek,
        p_target_week: targetWeek,
        p_project_ids: intProjectIds
      });

      if (error) throw error;
      return { success: true, copiedCount: data };
    } catch (error) {
      console.error('Error copying assignments:', error);
      throw error;
    }
  },

  // ================ UTILIZATION CALCULATIONS ================
  async getMemberUtilization(memberId, weekStartDate) {
    try {
      const { data, error } = await supabase.rpc('calculate_member_utilization', {
        p_member_id: memberId,
        p_week_start: weekStartDate
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error calculating utilization:', error);
      throw error;
    }
  },

  async getWeeklyTeamUtilization(weekStartDate) {
    const { data, error } = await supabase
      .from('weekly_member_utilization')
      .select('*')
      .eq('week_start_date', weekStartDate)
      .order('member_name');
    
    if (error) throw error;
    return { success: true, data };
  },

  async checkMemberAvailability(memberId, weekStartDate) {
    try {
      // Obtener capacidad del miembro
      const { data: member, error: memberError } = await supabase
        .from('team_members')
        .select('weekly_capacity')
        .eq('id', memberId)
        .single();

      if (memberError) throw memberError;

      // Obtener asignaciones actuales
      const { data: assignments, error: assignError } = await supabase
        .from('capacity_assignments')
        .select('assigned_hours')
        .eq('member_id', memberId)
        .eq('week_start_date', weekStartDate)
        .eq('status', 'Activa');

      if (assignError) throw assignError;

      const totalAssigned = assignments.reduce((sum, a) => sum + parseFloat(a.assigned_hours), 0);
      const available = member.weekly_capacity - totalAssigned;
      const utilizationPercentage = (totalAssigned / member.weekly_capacity) * 100;

      return {
        success: true,
        data: {
          member_id: memberId,
          week_start_date: weekStartDate,
          weekly_capacity: member.weekly_capacity,
          total_assigned: totalAssigned,
          available_hours: available,
          utilization_percentage: utilizationPercentage,
          can_assign_more: available > 0
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ================ PROJECT SUMMARIES ================
  async getProjectCapacitySummary(projectId, weekStartDate) {
    try {
      const { data, error } = await supabase.rpc('get_project_capacity_summary', {
        p_project_id: parseInt(projectId), // Convertir a INTEGER
        p_week_start: weekStartDate
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error getting project summary:', error);
      throw error;
    }
  },

  async getWeeklyProjectSummaries(weekStartDate) {
    const { data, error } = await supabase
      .from('project_capacity_summary')
      .select('*')
      .eq('week_start_date', weekStartDate)
      .order('total_hours', { ascending: false });
    
    if (error) throw error;
    return { success: true, data };
  },

  // ================ ALERTS ================
  async getActiveAlerts(limit = 50) {
    const { data, error } = await supabase
      .from('capacity_alerts')
      .select(`
        *,
        member:team_members(name),
        project:projects(name)
      `)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return { success: true, data };
  },

  async resolveAlert(alertId, resolvedBy) {
    const { data, error } = await supabase
      .from('capacity_alerts')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy
      })
      .eq('id', alertId)
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  },

  // ================ SETTINGS ================
  async getSettings() {
    const { data, error } = await supabase
      .from('capacity_settings')
      .select('*')
      .order('setting_key');
    
    if (error) throw error;
    
    // Convert to key-value object
    const settings = {};
    data.forEach(setting => {
      settings[setting.setting_key] = setting.setting_value;
    });
    
    return { success: true, data: settings };
  },

  async updateSetting(key, value, updatedBy) {
    const { data, error } = await supabase
      .from('capacity_settings')
      .upsert({
        setting_key: key,
        setting_value: value,
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  },

  // ================ TEMPLATES ================
  async getAssignmentTemplates() {
    const { data, error } = await supabase
      .from('assignment_templates')
      .select('*')
      .eq('is_active', true)
      .order('template_name');
    
    if (error) throw error;
    return { success: true, data };
  },

  async createAssignmentTemplate(template) {
    const { data, error } = await supabase
      .from('assignment_templates')
      .insert([template])
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  },

  // ================ DASHBOARD DATA ================
  async getDashboardData(weekStartDate) {
    try {
      // Obtener todas las métricas en paralelo
      const [
        teamUtilization,
        projectSummaries,
        activeAlerts,
        settings
      ] = await Promise.all([
        this.getWeeklyTeamUtilization(weekStartDate),
        this.getWeeklyProjectSummaries(weekStartDate),
        this.getActiveAlerts(10),
        this.getSettings()
      ]);

      // Calcular métricas agregadas
      const totalCapacity = teamUtilization.data.reduce((sum, member) => 
        sum + member.weekly_capacity, 0);
      const totalAssigned = teamUtilization.data.reduce((sum, member) => 
        sum + member.total_assigned, 0);
      const avgUtilization = totalCapacity > 0 ? (totalAssigned / totalCapacity) * 100 : 0;

      const overallocatedMembers = teamUtilization.data.filter(member => 
        member.utilization_percentage > 100).length;
      const underutilizedMembers = teamUtilization.data.filter(member => 
        member.utilization_percentage < 60).length;

      return {
        success: true,
        data: {
          week_start_date: weekStartDate,
          team_metrics: {
            total_members: teamUtilization.data.length,
            total_capacity: totalCapacity,
            total_assigned: totalAssigned,
            total_available: totalCapacity - totalAssigned,
            avg_utilization: Math.round(avgUtilization * 10) / 10,
            overallocated_members: overallocatedMembers,
            underutilized_members: underutilizedMembers
          },
          team_utilization: teamUtilization.data,
          project_summaries: projectSummaries.data,
          active_alerts: activeAlerts.data,
          settings: settings.data
        }
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
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