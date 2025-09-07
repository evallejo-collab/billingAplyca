import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl) {
  throw new Error('Supabase URL is required')
}

if (!supabaseAnonKey) {
  throw new Error('Supabase Anon Key is required')
}

// Create Supabase client with custom options for Vite compatibility
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 2
    }
  }
})