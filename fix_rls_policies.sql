-- Fix RLS policies for user_profiles table
-- First, drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;  
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Public profiles readable by authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "View user profiles policy" ON user_profiles;
DROP POLICY IF EXISTS "Update user profiles policy" ON user_profiles;
DROP POLICY IF EXISTS "Insert user profiles policy" ON user_profiles;
DROP POLICY IF EXISTS "Delete user profiles policy" ON user_profiles;

-- Temporarily disable RLS to avoid recursion issues
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Ensure the current user is set as admin first
UPDATE user_profiles 
SET role = 'admin', is_active = true
WHERE email = 'edwinvallejo@aplyca.com';

-- Create a simple function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND au.email = 'edwinvallejo@aplyca.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create simple policies that avoid recursion
-- Allow admin user (based on email) to see all profiles
CREATE POLICY "Admin can view all profiles" ON user_profiles
  FOR SELECT 
  USING (is_admin());

-- Allow users to see their own profile  
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT 
  USING (auth.uid() = id);

-- Allow admin to update all profiles
CREATE POLICY "Admin can update all profiles" ON user_profiles
  FOR UPDATE 
  USING (is_admin());

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE 
  USING (auth.uid() = id);

-- Allow admin to insert profiles
CREATE POLICY "Admin can insert profiles" ON user_profiles
  FOR INSERT 
  WITH CHECK (is_admin());

-- Allow inserting own profile during registration
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Allow admin to delete profiles  
CREATE POLICY "Admin can delete profiles" ON user_profiles
  FOR DELETE 
  USING (is_admin());