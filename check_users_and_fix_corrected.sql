-- Check current users and fix the issue (CORRECTED)

-- STEP 1: Check all users in user_profiles
SELECT 'All users in user_profiles:' as info;
SELECT id, email, role, is_active, created_at FROM user_profiles ORDER BY created_at;

-- STEP 2: Check all users in auth.users 
SELECT 'All users in auth.users:' as info;
SELECT id, email, created_at, deleted_at FROM auth.users ORDER BY created_at;

-- STEP 3: Check if there are users in auth.users but not in user_profiles
SELECT 'Users in auth.users but missing from user_profiles:' as info;
SELECT au.id, au.email, au.created_at
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL AND au.deleted_at IS NULL;

-- STEP 4: Create profiles for any missing users (should default to 'client' role)
INSERT INTO user_profiles (id, email, full_name, role, is_active, created_at)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', email),
    CASE 
        WHEN email = 'edwin@aplyca.com' THEN 'admin'
        WHEN email = 'evallejo@aplyca.com' THEN 'admin' -- Add your actual email here
        ELSE 'client'
    END,
    true, 
    NOW()
FROM auth.users 
WHERE deleted_at IS NULL
AND id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

-- STEP 5: Show users again after fix
SELECT 'Users after fix:' as info;
SELECT id, email, role, is_active FROM user_profiles ORDER BY role, email;

-- STEP 6: Show only non-admin users (these should appear in the association dropdown)
SELECT 'Non-admin users (should appear in association dropdown):' as info;
SELECT id, email, full_name, role FROM user_profiles WHERE role != 'admin' ORDER BY full_name;