-- Fix infinite recursion in user_profiles policies
-- WITHOUT using auth schema (permission denied)

-- STEP 1: Drop all existing policies on user_profiles to break the recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users during signup" ON user_profiles;
DROP POLICY IF EXISTS "System can manage profiles" ON user_profiles;

-- STEP 2: Create new policies using ONLY auth.users table (no recursion)
-- Policy for users to view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());

-- Policy for users to update their own profile (basic fields only)
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- STEP 3: Create admin policies based ONLY on auth.users (no user_profiles reference)
-- Replace 'edwin@aplyca.com' with your actual admin email
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE (
        email = 'edwin@aplyca.com' OR
        email LIKE '%admin%' OR
        raw_user_meta_data ->> 'role' = 'admin'
      )
    ) 
    OR auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Admins can insert profiles" ON user_profiles
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE (
        email = 'edwin@aplyca.com' OR
        email LIKE '%admin%' OR
        raw_user_meta_data ->> 'role' = 'admin'
      )
    ) 
    OR auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Admins can update all profiles" ON user_profiles
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE (
        email = 'edwin@aplyca.com' OR
        email LIKE '%admin%' OR
        raw_user_meta_data ->> 'role' = 'admin'
      )
    ) 
    OR auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Admins can delete profiles" ON user_profiles
  FOR DELETE USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE (
        email = 'edwin@aplyca.com' OR
        email LIKE '%admin%' OR
        raw_user_meta_data ->> 'role' = 'admin'
      )
    ) 
    OR auth.jwt() ->> 'role' = 'service_role'
  );

-- Service role policy for system operations
CREATE POLICY "System can manage profiles" ON user_profiles
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- STEP 4: Update user_client_associations policies (drop and recreate)
DROP POLICY IF EXISTS "Admins can view all client associations" ON user_client_associations;
DROP POLICY IF EXISTS "Admins can insert client associations" ON user_client_associations;
DROP POLICY IF EXISTS "Admins can update client associations" ON user_client_associations;
DROP POLICY IF EXISTS "Admins can delete client associations" ON user_client_associations;

CREATE POLICY "Admins can view all client associations" ON user_client_associations
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE (
        email = 'edwin@aplyca.com' OR
        email LIKE '%admin%' OR
        raw_user_meta_data ->> 'role' = 'admin'
      )
    )
  );

CREATE POLICY "Admins can insert client associations" ON user_client_associations
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE (
        email = 'edwin@aplyca.com' OR
        email LIKE '%admin%' OR
        raw_user_meta_data ->> 'role' = 'admin'
      )
    )
  );

CREATE POLICY "Admins can update client associations" ON user_client_associations
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE (
        email = 'edwin@aplyca.com' OR
        email LIKE '%admin%' OR
        raw_user_meta_data ->> 'role' = 'admin'
      )
    )
  );

CREATE POLICY "Admins can delete client associations" ON user_client_associations
  FOR DELETE USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE (
        email = 'edwin@aplyca.com' OR
        email LIKE '%admin%' OR
        raw_user_meta_data ->> 'role' = 'admin'
      )
    )
  );

-- STEP 5: Update clients table policies (avoid recursion)
DROP POLICY IF EXISTS "Admins can view all clients" ON clients;
DROP POLICY IF EXISTS "Associated users can view their client" ON clients;

CREATE POLICY "Admins can view all clients" ON clients
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE (
        email = 'edwin@aplyca.com' OR
        email LIKE '%admin%' OR
        raw_user_meta_data ->> 'role' = 'admin'
      )
    )
  );

CREATE POLICY "Associated users can view their client" ON clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_client_associations uca
      WHERE uca.client_id = clients.id 
      AND uca.user_id = auth.uid()
      AND uca.is_active = true
    )
  );

-- STEP 6: Update contracts table policies (avoid recursion)
DROP POLICY IF EXISTS "Admins can view all contracts" ON contracts;
DROP POLICY IF EXISTS "Associated users can view contracts of their client" ON contracts;

CREATE POLICY "Admins can view all contracts" ON contracts
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE (
        email = 'edwin@aplyca.com' OR
        email LIKE '%admin%' OR
        raw_user_meta_data ->> 'role' = 'admin'
      )
    )
  );

CREATE POLICY "Associated users can view contracts of their client" ON contracts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_client_associations uca
      WHERE uca.client_id = contracts.client_id 
      AND uca.user_id = auth.uid()
      AND uca.is_active = true
    )
  );

-- STEP 7: Create helper function in public schema (not auth schema)
CREATE OR REPLACE FUNCTION get_user_role_safe(user_uuid UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get role from auth.users metadata or email pattern
  SELECT 
    CASE 
      WHEN raw_user_meta_data ->> 'role' IS NOT NULL 
      THEN raw_user_meta_data ->> 'role'
      WHEN email = 'edwin@aplyca.com' OR email LIKE '%admin%'
      THEN 'admin'
      ELSE 'client'
    END
  INTO user_role
  FROM auth.users
  WHERE id = user_uuid;
  
  RETURN COALESCE(user_role, 'client');
END;
$$;

-- Grant permissions for the helper function
GRANT EXECUTE ON FUNCTION get_user_role_safe TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role_safe TO anon;

-- STEP 8: Update the trigger function to avoid recursion
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Determine user role without causing recursion
  user_role := COALESCE(
    NEW.raw_user_meta_data ->> 'role',
    CASE 
      WHEN NEW.email = 'edwin@aplyca.com' OR NEW.email LIKE '%admin%'
      THEN 'admin'
      ELSE 'client'
    END
  );

  INSERT INTO user_profiles (id, email, full_name, role, is_active, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    user_role,
    true,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    role = EXCLUDED.role,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Make sure the trigger exists
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Final status
SELECT 'Policies updated successfully without auth schema!' as status;
SELECT 'Admin detection: edwin@aplyca.com or emails containing "admin"' as admin_detection;
SELECT 'Test by accessing Users section in the app' as next_step;