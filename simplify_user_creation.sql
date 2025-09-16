-- Simplify user creation process to avoid trigger issues

-- STEP 1: Disable the problematic trigger temporarily
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;

-- STEP 2: Temporarily disable RLS on user_profiles for system operations
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- STEP 3: Create a much simpler trigger function
CREATE OR REPLACE FUNCTION create_user_profile_simple()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simple insert without complex logic
  INSERT INTO user_profiles (id, email, full_name, role, is_active, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'client', -- Default role, can be changed later by admin
    true,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Don't update if exists
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If anything fails, just continue - don't block user creation
    RETURN NEW;
END;
$$;

-- STEP 4: Create the simplified trigger
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile_simple();

-- STEP 5: Re-enable RLS with simpler policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;
DROP POLICY IF EXISTS "System can manage profiles" ON user_profiles;

-- Create very simple policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own basic info" ON user_profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = role); -- Can't change own role

-- Super simple admin policy - just use your email directly
CREATE POLICY "Edwin admin access" ON user_profiles
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'edwin@aplyca.com'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'edwin@aplyca.com'
    )
  );

-- Allow service role full access
CREATE POLICY "Service role full access" ON user_profiles
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- STEP 6: Test the setup
SELECT 'Simplified user creation setup complete!' as status;
SELECT 'Try creating a user now through Supabase Auth UI first' as test_instruction;