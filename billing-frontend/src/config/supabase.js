import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Environment variables validated during build

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