-- EMERGENCY FIX: Temporarily disable RLS to restore access
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop all current policies that might be causing issues
DROP POLICY IF EXISTS "Allow authenticated users to view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to delete profiles" ON user_profiles;

-- Re-enable RLS with very permissive policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create very simple policies
CREATE POLICY "Allow all authenticated users full access" ON user_profiles
  FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Verify your admin status
SELECT id, email, role, is_active FROM user_profiles WHERE email = 'edwinvallejo@aplyca.com';