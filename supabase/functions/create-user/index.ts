import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create admin Supabase client using service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create regular Supabase client for user validation
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the calling user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if the user is admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      throw new Error('Insufficient permissions - Admin required')
    }

    // Parse the request body
    const { email, password, full_name, role, client_id, is_active } = await req.json()

    if (!email || !password || !full_name || !role) {
      throw new Error('Missing required fields: email, password, full_name, role')
    }

    // Validate role
    const validRoles = ['admin', 'collaborator', 'client']
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`)
    }

    // Create the user using admin client
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: full_name
      }
    })

    if (createError) {
      throw createError
    }

    // Create or update the user profile
    const { error: profileInsertError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: newUser.user.id,
        email: email,
        full_name: full_name,
        role: role,
        client_id: client_id || null,
        is_active: is_active !== false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileInsertError) {
      console.error('Profile creation error:', profileInsertError)
      // Don't throw here as the user was created successfully
      // The trigger should handle profile creation
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User created successfully',
        user: {
          id: newUser.user.id,
          email: email,
          full_name: full_name,
          role: role,
          is_active: is_active !== false
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error.message)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})