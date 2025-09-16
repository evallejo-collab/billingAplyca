-- Fix infinite recursion in user_profiles policies
-- The problem is that policies are referencing user_profiles table to check roles,
-- which creates infinite recursion

-- STEP 1: Drop all existing policies on user_profiles to break the recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users during signup" ON user_profiles;

-- STEP 2: Create a simple, non-recursive approach using JWT claims
-- We'll store the user role in JWT claims to avoid querying user_profiles

-- Create a function to check if current user is admin using JWT claims
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user has admin role in JWT claims
  RETURN (auth.jwt() ->> 'role' = 'admin' OR 
          auth.jwt() ->> 'user_role' = 'admin' OR
          (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
          (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
END;
$$;

-- STEP 3: Create new policies using a different approach
-- Use a recursive-safe method by checking auth.users directly

-- Policy for users to view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());

-- Policy for users to update their own profile (basic fields only)
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- For admin operations, we'll use a different strategy
-- Create policies that work without recursion

-- Admin view policy - use auth.users table instead of user_profiles to avoid recursion
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    -- Check if user exists in auth.users and has admin email pattern or is service_role
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE (
        email LIKE '%@admin.%' OR 
        email IN ('admin@example.com', 'edwin@aplyca.com') OR
        raw_user_meta_data ->> 'role' = 'admin'
      )
    ) 
    OR auth.jwt() ->> 'role' = 'service_role'
  );

-- Admin insert policy
CREATE POLICY "Admins can insert profiles" ON user_profiles
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE (
        email LIKE '%@admin.%' OR 
        email IN ('admin@example.com', 'edwin@aplyca.com') OR
        raw_user_meta_data ->> 'role' = 'admin'
      )
    ) 
    OR auth.jwt() ->> 'role' = 'service_role'
  );

-- Admin update policy
CREATE POLICY "Admins can update all profiles" ON user_profiles
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE (
        email LIKE '%@admin.%' OR 
        email IN ('admin@example.com', 'edwin@aplyca.com') OR
        raw_user_meta_data ->> 'role' = 'admin'
      )
    ) 
    OR auth.jwt() ->> 'role' = 'service_role'
  );

-- Admin delete policy
CREATE POLICY "Admins can delete profiles" ON user_profiles
  FOR DELETE USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE (
        email LIKE '%@admin.%' OR 
        email IN ('admin@example.com', 'edwin@aplyca.com') OR
        raw_user_meta_data ->> 'role' = 'admin'
      )
    ) 
    OR auth.jwt() ->> 'role' = 'service_role'
  );

-- Service role and trigger policies
CREATE POLICY "System can manage profiles" ON user_profiles
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- STEP 4: Update user_client_associations policies to use the same approach
DROP POLICY IF EXISTS "Admins can view all client associations" ON user_client_associations;
DROP POLICY IF EXISTS "Admins can insert client associations" ON user_client_associations;
DROP POLICY IF EXISTS "Admins can update client associations" ON user_client_associations;
DROP POLICY IF EXISTS "Admins can delete client associations" ON user_client_associations;

CREATE POLICY "Admins can view all client associations" ON user_client_associations
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE (
        email LIKE '%@admin.%' OR 
        email IN ('admin@example.com', 'edwin@aplyca.com') OR
        raw_user_meta_data ->> 'role' = 'admin'
      )
    )
  );

CREATE POLICY "Admins can insert client associations" ON user_client_associations
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE (
        email LIKE '%@admin.%' OR 
        email IN ('admin@example.com', 'edwin@aplyca.com') OR
        raw_user_meta_data ->> 'role' = 'admin'
      )
    )
  );

CREATE POLICY "Admins can update client associations" ON user_client_associations
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE (
        email LIKE '%@admin.%' OR 
        email IN ('admin@example.com', 'edwin@aplyca.com') OR
        raw_user_meta_data ->> 'role' = 'admin'
      )
    )
  );

CREATE POLICY "Admins can delete client associations" ON user_client_associations
  FOR DELETE USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE (
        email LIKE '%@admin.%' OR 
        email IN ('admin@example.com', 'edwin@aplyca.com') OR
        raw_user_meta_data ->> 'role' = 'admin'
      )
    )
  );

-- STEP 5: Update other table policies to avoid recursion
-- Update clients table policies
DROP POLICY IF EXISTS "Admins can view all clients" ON clients;
DROP POLICY IF EXISTS "Associated users can view their client" ON clients;

CREATE POLICY "Admins can view all clients" ON clients
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE (
        email LIKE '%@admin.%' OR 
        email IN ('admin@example.com', 'edwin@aplyca.com') OR
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
      -- Don't check role here to avoid recursion
    )
  );

-- Update contracts table policies
DROP POLICY IF EXISTS "Admins can view all contracts" ON contracts;
DROP POLICY IF EXISTS "Associated users can view contracts of their client" ON contracts;

CREATE POLICY "Admins can view all contracts" ON contracts
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE (
        email LIKE '%@admin.%' OR 
        email IN ('admin@example.com', 'edwin@aplyca.com') OR
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

-- STEP 6: Create a helper function to safely get user role without recursion
CREATE OR REPLACE FUNCTION get_user_role_safe(user_uuid UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- First try to get from auth.users metadata
  SELECT raw_user_meta_data ->> 'role' INTO user_role
  FROM auth.users
  WHERE id = user_uuid;
  
  -- If not found in metadata, check email patterns for admin
  IF user_role IS NULL THEN
    SELECT CASE 
      WHEN email LIKE '%@admin.%' OR email IN ('admin@example.com', 'edwin@aplyca.com') 
      THEN 'admin'
      ELSE 'client'
    END INTO user_role
    FROM auth.users
    WHERE id = user_uuid;
  END IF;
  
  RETURN COALESCE(user_role, 'client');
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_role_safe TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_admin TO authenticated;

-- Update the user profile creation trigger to set role in auth metadata
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Determine user role from metadata or email
  user_role := COALESCE(
    NEW.raw_user_meta_data ->> 'role',
    CASE 
      WHEN NEW.email LIKE '%@admin.%' OR NEW.email IN ('admin@example.com', 'edwin@aplyca.com') 
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

-- Display completion status
SELECT 'Infinite recursion policies fixed successfully!' as status;
SELECT 'Admin detection now uses auth.users table and email patterns' as method;
SELECT 'Make sure your admin user email matches the patterns in the policies' as important_note;