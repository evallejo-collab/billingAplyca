import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200
    })
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
    const body = await req.text()
    const { email, full_name, role, client_id } = JSON.parse(body)

    if (!email || !full_name || !role) {
      throw new Error('Missing required fields: email, full_name, role')
    }

    // Validate role
    const validRoles = ['admin', 'collaborator', 'client']
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`)
    }

    // Store the invitation data in a pending_invitations table
    // We'll need to create this table first
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('pending_invitations')
      .insert({
        email: email,
        full_name: full_name,
        role: role,
        client_id: client_id || null,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        status: 'pending'
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error storing invitation:', inviteError)
      throw new Error('Error storing invitation data')
    }

    // Send invitation email using Supabase Auth
    const { data: inviteData, error: sendError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name: full_name,
          role: role,
          client_id: client_id || null,
          invitation_id: invitation.id
        },
        redirectTo: `${Deno.env.get('SITE_URL') || 'http://localhost:3000'}/accept-invitation`
      }
    )

    if (sendError) {
      console.error('Error sending invitation:', sendError)
      throw new Error('Error sending invitation email')
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation sent successfully',
        invitation: {
          email: email,
          full_name: full_name,
          role: role,
          invited_at: invitation.invited_at
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Function error:', error.message)
    
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