-- Fix user creation issues by updating triggers and policies

-- First, let's check and fix the user_profiles table policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users during signup" ON user_profiles;

-- Create comprehensive policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert profiles" ON user_profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles" ON user_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete profiles" ON user_profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow service_role to insert (for triggers and functions)
CREATE POLICY "Service role can insert profiles" ON user_profiles
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Create or replace the trigger function for automatic profile creation
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name, role, is_active, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    true,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;

-- Create the trigger
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- Ensure the function has proper permissions
ALTER FUNCTION create_user_profile() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION create_user_profile() TO service_role;
GRANT EXECUTE ON FUNCTION create_user_profile() TO postgres;

-- Create a function to safely invite users (to be used by admin interface)
CREATE OR REPLACE FUNCTION invite_user_safely(
  user_email TEXT,
  user_full_name TEXT DEFAULT NULL,
  user_role TEXT DEFAULT 'client',
  redirect_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  new_user_id UUID;
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN json_build_object('error', 'Only admins can invite users');
  END IF;

  -- Check if user already exists
  IF EXISTS (
    SELECT 1 FROM auth.users WHERE email = user_email
  ) THEN
    RETURN json_build_object('error', 'User with this email already exists');
  END IF;

  -- Try to create the user profile preemptively with a generated UUID
  new_user_id := gen_random_uuid();
  
  INSERT INTO user_profiles (id, email, full_name, role, is_active, created_at)
  VALUES (
    new_user_id,
    user_email,
    COALESCE(user_full_name, user_email),
    COALESCE(user_role, 'client'),
    true,
    NOW()
  );

  RETURN json_build_object(
    'success', true, 
    'message', 'User profile created. Admin should send manual invitation.',
    'user_id', new_user_id,
    'email', user_email
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Grant execute permission on the invite function
GRANT EXECUTE ON FUNCTION invite_user_safely TO authenticated;

-- Display status
SELECT 'User creation policies and triggers updated successfully' as status;
SELECT 'Use the invite_user_safely function or create users manually via Supabase Auth' as instruction;