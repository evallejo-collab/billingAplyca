-- Deep diagnosis of database structure and constraints

-- STEP 1: Check if user_profiles table exists and its structure
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- STEP 2: Check all constraints on user_profiles
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    tc.table_name,
    kcu.column_name,
    tc.is_deferrable,
    tc.initially_deferred,
    rc.match_option AS match_type,
    rc.update_rule,
    rc.delete_rule,
    ccu.table_name AS referenced_table_name,
    ccu.column_name AS referenced_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_catalog = kcu.constraint_catalog
    AND tc.constraint_schema = kcu.constraint_schema
    AND tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.referential_constraints rc
    ON tc.constraint_catalog = rc.constraint_catalog
    AND tc.constraint_schema = rc.constraint_schema
    AND tc.constraint_name = rc.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
    ON rc.unique_constraint_catalog = ccu.constraint_catalog
    AND rc.unique_constraint_schema = ccu.constraint_schema
    AND rc.unique_constraint_name = ccu.constraint_name
WHERE tc.table_name = 'user_profiles';

-- STEP 3: Check if there are any triggers still active
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'user_profiles' 
   OR trigger_name LIKE '%user%';

-- STEP 4: Check auth.users table structure to ensure compatibility
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'auth'
ORDER BY ordinal_position;

-- STEP 5: Check if there are any existing users in auth.users
SELECT 
    id, 
    email, 
    created_at,
    email_confirmed_at,
    deleted_at
FROM auth.users 
LIMIT 5;

-- STEP 6: Check if user_profiles has any existing data
SELECT 
    id, 
    email, 
    role,
    created_at
FROM user_profiles 
LIMIT 5;

-- STEP 7: Try to identify the specific foreign key constraint causing issues
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    a.attname AS column_name,
    af.attname AS referenced_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
LEFT JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE conrelid = 'user_profiles'::regclass;

-- STEP 8: Check if the foreign key reference to auth.users is the problem
-- Try to create a test user_profiles record manually
DO $$
BEGIN
    -- Try to insert a test record with a fake UUID
    INSERT INTO user_profiles (id, email, full_name, role, is_active, created_at)
    VALUES (
        gen_random_uuid(),
        'test@example.com',
        'Test User',
        'client',
        true,
        NOW()
    );
    RAISE NOTICE 'SUCCESS: Test insert worked without auth.users reference';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR in test insert: %', SQLERRM;
END $$;

-- STEP 9: Check recent database logs for more specific errors
-- This will show us what's actually failing
SELECT 'Diagnosis complete - check the output above for constraint issues' AS status;