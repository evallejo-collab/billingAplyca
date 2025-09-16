-- Debug: Check what users exist
SELECT 'AUTH USERS:' as table_name;
SELECT id, email, created_at FROM auth.users ORDER BY created_at;

SELECT 'USER PROFILES:' as table_name;
SELECT id, email, full_name, role, is_active, created_at FROM user_profiles ORDER BY created_at;

-- Check current RLS policies
SELECT 'CURRENT POLICIES:' as info;
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- Let's create some test user profiles manually (since we can't create auth users from SQL)
-- First, let's see if there are auth users without profiles
SELECT 'AUTH USERS WITHOUT PROFILES:' as info;
SELECT au.id, au.email 
FROM auth.users au 
LEFT JOIN user_profiles up ON au.id = up.id 
WHERE up.id IS NULL;

-- Insert profiles for any auth users that don't have them
INSERT INTO user_profiles (id, email, full_name, role, is_active, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', 'Usuario Test'),
  CASE 
    WHEN au.email = 'edwinvallejo@aplyca.com' THEN 'admin'
    ELSE 'collaborator'
  END,
  true,
  NOW()
FROM auth.users au 
LEFT JOIN user_profiles up ON au.id = up.id 
WHERE up.id IS NULL;

-- Verify the insert worked
SELECT 'UPDATED USER PROFILES:' as info;
SELECT id, email, full_name, role, is_active, created_at FROM user_profiles ORDER BY created_at;