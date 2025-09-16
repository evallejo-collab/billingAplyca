-- First, let's see what your user ID is
SELECT id, email FROM auth.users WHERE email = 'edwinvallejo@aplyca.com';

-- Check your user profile
SELECT * FROM user_profiles WHERE email = 'edwinvallejo@aplyca.com';

-- Drop the problematic policies first, then function
DROP POLICY IF EXISTS "Admin can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admin can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admin can delete profiles" ON user_profiles;
DROP FUNCTION IF EXISTS is_admin();

-- Temporarily disable RLS
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Make sure your user has admin role
UPDATE user_profiles 
SET role = 'admin', is_active = true
WHERE email = 'edwinvallejo@aplyca.com';

-- For now, let's use a simpler approach - allow authenticated users to see all profiles
-- This is temporary while we debug the admin permissions
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create simple policies for debugging
CREATE POLICY "Allow authenticated users to view all profiles" ON user_profiles
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update all profiles" ON user_profiles
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert profiles" ON user_profiles
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete profiles" ON user_profiles
  FOR DELETE 
  USING (auth.role() = 'authenticated');