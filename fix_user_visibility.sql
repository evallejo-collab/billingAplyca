-- Fix user visibility issues in the app

-- STEP 1: Check your actual email and role
SELECT 'Your current user info:' as info;
SELECT 
    au.email as auth_email,
    up.email as profile_email,
    up.role,
    up.is_active,
    auth.uid() as current_auth_uid
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE au.id = auth.uid();

-- STEP 2: Check all users bypassing RLS (as superuser)
SET row_security = off;
SELECT 'All users in user_profiles (bypassing RLS):' as info;
SELECT id, email, role, is_active, created_at FROM user_profiles ORDER BY created_at;
SET row_security = on;

-- STEP 3: Fix your role to admin if it's incorrect
UPDATE user_profiles 
SET role = 'admin'
WHERE email = 'evallejo@aplyca.com';

-- Also add edwin email pattern if that's what you use
UPDATE user_profiles 
SET role = 'admin'
WHERE email = 'edwin@aplyca.com';

-- STEP 4: Check current RLS policies on user_profiles
SELECT 'Current policies on user_profiles:' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- STEP 5: Temporarily disable RLS to test
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- STEP 6: Check if this fixes the visibility
SELECT 'Users visible after disabling RLS:' as info;
SELECT id, email, role, is_active FROM user_profiles ORDER BY role, email;

-- STEP 7: Re-enable RLS and create simpler policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admin full access" ON user_profiles;

-- Create very simple policies
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Admin policy - check multiple possible admin emails
CREATE POLICY "Admin full access" ON user_profiles
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE (
                email = 'evallejo@aplyca.com' OR
                email = 'edwin@aplyca.com' OR
                email LIKE '%@aplyca.com'
            )
            AND deleted_at IS NULL
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE (
                email = 'evallejo@aplyca.com' OR
                email = 'edwin@aplyca.com' OR
                email LIKE '%@aplyca.com'
            )
            AND deleted_at IS NULL
        )
    );

-- STEP 8: Test the policies
SELECT 'Testing admin access after policy fix:' as info;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND (
                email = 'evallejo@aplyca.com' OR
                email = 'edwin@aplyca.com' OR
                email LIKE '%@aplyca.com'
            )
            AND deleted_at IS NULL
        ) THEN 'You have admin access'
        ELSE 'You do NOT have admin access'
    END as admin_status;

-- STEP 9: Show final user list
SELECT 'Final user list (with RLS):' as info;
SELECT id, email, role, is_active FROM user_profiles ORDER BY role, email;