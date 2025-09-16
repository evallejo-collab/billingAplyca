-- Disable automatic trigger and create manual user management

-- STEP 1: Remove the problematic trigger completely
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile_simple();
DROP FUNCTION IF EXISTS create_user_profile();

-- STEP 2: Disable RLS temporarily to clean up
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- STEP 3: Clean up any orphaned profiles or duplicates
-- (Optional - be careful in production)
-- DELETE FROM user_profiles WHERE id NOT IN (SELECT id FROM auth.users);

-- STEP 4: Re-enable RLS with very simple policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies first
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_profiles';
    END LOOP;
END $$;

-- Create minimal, safe policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin policy using only your specific email
CREATE POLICY "Admin full access" ON user_profiles
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = 'edwin@aplyca.com'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = 'edwin@aplyca.com'
    )
  );

-- Service role access for system operations
CREATE POLICY "Service role access" ON user_profiles
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- STEP 5: Create a function to manually create user profiles
CREATE OR REPLACE FUNCTION create_user_profile_manual(
  user_email TEXT,
  user_full_name TEXT DEFAULT NULL,
  user_role TEXT DEFAULT 'client'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auth_user_id UUID;
  result JSON;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() AND email = 'edwin@aplyca.com'
  ) THEN
    RETURN json_build_object('error', 'Only admin can create user profiles');
  END IF;
  
  -- Get the auth user ID
  SELECT id INTO auth_user_id 
  FROM auth.users 
  WHERE email = user_email;
  
  IF auth_user_id IS NULL THEN
    RETURN json_build_object('error', 'User not found in auth.users');
  END IF;
  
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM user_profiles WHERE id = auth_user_id) THEN
    RETURN json_build_object('error', 'User profile already exists');
  END IF;
  
  -- Create the profile
  INSERT INTO user_profiles (id, email, full_name, role, is_active, created_at)
  VALUES (
    auth_user_id,
    user_email,
    COALESCE(user_full_name, user_email),
    COALESCE(user_role, 'client'),
    true,
    NOW()
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'User profile created successfully',
    'user_id', auth_user_id,
    'email', user_email,
    'role', user_role
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_user_profile_manual TO authenticated;

-- STEP 6: Create a function to sync existing auth users
CREATE OR REPLACE FUNCTION sync_auth_users_to_profiles()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  synced_count INTEGER := 0;
  auth_user RECORD;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() AND email = 'edwin@aplyca.com'
  ) THEN
    RETURN json_build_object('error', 'Only admin can sync users');
  END IF;
  
  -- Loop through auth users that don't have profiles
  FOR auth_user IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN user_profiles up ON au.id = up.id
    WHERE up.id IS NULL
  LOOP
    INSERT INTO user_profiles (id, email, full_name, role, is_active, created_at)
    VALUES (
      auth_user.id,
      auth_user.email,
      COALESCE(auth_user.raw_user_meta_data->>'full_name', auth_user.email),
      CASE 
        WHEN auth_user.email = 'edwin@aplyca.com' THEN 'admin'
        ELSE 'client'
      END,
      true,
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    synced_count := synced_count + 1;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'synced_count', synced_count,
    'message', 'Users synced successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION sync_auth_users_to_profiles TO authenticated;

-- STEP 7: Display instructions
SELECT 'Trigger disabled - manual user management enabled' as status;
SELECT 'Use sync_auth_users_to_profiles() to sync existing users' as instruction_1;
SELECT 'Create users directly in Supabase Auth Dashboard first, then sync' as instruction_2;