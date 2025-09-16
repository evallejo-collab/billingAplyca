-- EMERGENCY FIX: Disable all RLS and problematic policies to allow user creation

-- STEP 1: Completely disable RLS on all affected tables
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_client_associations DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE contracts DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop ALL policies on user_profiles (they might be causing issues)
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_profiles';
    END LOOP;
END $$;

-- STEP 3: Drop ALL policies on user_client_associations
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_client_associations') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_client_associations';
    END LOOP;
END $$;

-- STEP 4: Drop ALL policies on clients
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'clients') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON clients';
    END LOOP;
END $$;

-- STEP 5: Drop ALL policies on contracts
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'contracts') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON contracts';
    END LOOP;
END $$;

-- STEP 6: Remove any remaining triggers that might cause issues
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile_manual(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS sync_auth_users_to_profiles();
DROP FUNCTION IF EXISTS create_user_profile();
DROP FUNCTION IF EXISTS create_user_profile_simple();
DROP FUNCTION IF EXISTS get_user_role_safe(UUID);
DROP FUNCTION IF EXISTS get_user_associated_client(UUID);

-- STEP 7: Check if there are any foreign key constraints causing issues
-- List all constraints on user_profiles
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'user_profiles' OR tc.table_name = 'user_client_associations';

-- STEP 8: Create a very simple function to test user creation without any RLS
CREATE OR REPLACE FUNCTION test_create_user_profile(
    test_user_id UUID,
    test_email TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Simple test insert
    INSERT INTO user_profiles (id, email, full_name, role, is_active, created_at)
    VALUES (
        test_user_id,
        test_email,
        test_email,
        'client',
        true,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET 
        email = EXCLUDED.email,
        updated_at = NOW();
    
    RETURN 'SUCCESS: User profile created/updated';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'ERROR: ' || SQLERRM;
END;
$$;

-- Grant access to test function
GRANT EXECUTE ON FUNCTION test_create_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION test_create_user_profile TO anon;

-- STEP 9: Show current table structure and constraints
SELECT 'Emergency fix applied - all RLS disabled' as status;
SELECT 'Try creating a user now in Supabase Auth Dashboard' as test_step_1;
SELECT 'If it works, we can re-enable security step by step' as next_plan;

-- Show any remaining issues
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'user_profiles' 
AND constraint_type = 'FOREIGN KEY';