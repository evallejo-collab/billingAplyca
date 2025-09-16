-- Fix the trigger that might be causing the signup error
-- First, let's make the trigger more robust with better error handling

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  invitation_data RECORD;
BEGIN
  -- Log for debugging
  RAISE LOG 'Processing new user: %', NEW.email;

  -- Try to find and update pending invitation
  BEGIN
    UPDATE pending_invitations 
    SET status = 'accepted', accepted_at = NOW()
    WHERE email = NEW.email AND status = 'pending';
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error updating invitation: %', SQLERRM;
  END;

  -- Get invitation data if exists
  SELECT * INTO invitation_data 
  FROM pending_invitations 
  WHERE email = NEW.email AND status = 'accepted' 
  ORDER BY invited_at DESC 
  LIMIT 1;

  -- Insert or update user profile
  BEGIN
    INSERT INTO public.user_profiles (
      id, 
      email, 
      full_name, 
      role, 
      client_id, 
      is_active,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(
        invitation_data.full_name,
        NEW.raw_user_meta_data->>'full_name',
        'Usuario'
      ),
      COALESCE(
        invitation_data.role,
        CASE 
          WHEN NEW.email = 'evallejo@aplyca.com' THEN 'admin'
          WHEN NEW.email = 'edwinvallejo@aplyca.com' THEN 'admin'
          ELSE 'collaborator'
        END
      ),
      invitation_data.client_id,
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      client_id = EXCLUDED.client_id,
      updated_at = NOW();

    RAISE LOG 'User profile created successfully for: %', NEW.email;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error creating user profile: %', SQLERRM;
    -- Don't fail the entire signup process if profile creation fails
    -- The user can still be created in auth.users
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also, let's check if we have the right permissions on user_profiles
-- Grant necessary permissions
GRANT INSERT, UPDATE, SELECT ON public.user_profiles TO postgres;
GRANT USAGE ON SCHEMA public TO postgres;