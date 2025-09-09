import { createClient } from '@supabase/supabase-js'

// IMPORTANT: This should only be used by admin users for user management
// In production, this should be moved to a secure backend endpoint
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// Only create admin client if service key is available
let supabaseAdmin = null;

if (supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export { supabaseAdmin }