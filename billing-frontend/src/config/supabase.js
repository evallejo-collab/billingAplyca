import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debug environment variables
console.log('Environment Debug:', {
  supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING',
  supabaseAnonKey: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING',
  allEnvVars: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
})

// Validate environment variables
if (!supabaseUrl) {
  console.error('VITE_SUPABASE_URL is not defined. Please add it to your environment variables.')
  throw new Error('Supabase URL is required')
}

if (!supabaseAnonKey) {
  console.error('VITE_SUPABASE_ANON_KEY is not defined. Please add it to your environment variables.')
  throw new Error('Supabase Anon Key is required')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)