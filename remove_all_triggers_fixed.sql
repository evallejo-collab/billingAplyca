-- Remove ALL triggers using information_schema (compatible with Supabase)

-- STEP 1: List all triggers first to see what we're dealing with
SELECT 
    trigger_schema,
    event_object_table,
    trigger_name,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%user%' 
   OR trigger_name LIKE '%profile%'
   OR trigger_name LIKE '%auth%'
   OR event_object_table = 'users'
   OR event_object_table LIKE '%user%';

-- STEP 2: Drop ALL known triggers on auth.users table
DROP TRIGGER IF EXISTS sync_new_auth_user_trigger ON auth.users;
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_auth_user_new ON auth.users;

-- STEP 3: Drop ALL related functions that could be called by triggers
DROP FUNCTION IF EXISTS sync_new_auth_user() CASCADE;
DROP FUNCTION IF EXISTS create_user_profile() CASCADE;
DROP FUNCTION IF EXISTS create_user_profile_simple() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS on_auth_user_created() CASCADE;
DROP FUNCTION IF EXISTS handle_auth_user_new() CASCADE;
DROP FUNCTION IF EXISTS test_create_user_profile(UUID, TEXT) CASCADE;

-- STEP 4: Check if there are any other triggers we missed on auth.users
SELECT 
    'Remaining triggers on auth.users:' as info,
    trigger_name,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'auth' 
AND event_object_table = 'users';

-- STEP 5: Check for triggers on user_profiles
SELECT 
    'Triggers on user_profiles:' as info,
    trigger_name,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'user_profiles';

-- STEP 6: Drop any triggers on user_profiles using a safer approach
DO $$ 
DECLARE 
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'user_profiles'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name || ' ON user_profiles CASCADE';
    END LOOP;
END $$;

-- STEP 7: Also drop triggers on any other tables that might reference users
DO $$ 
DECLARE 
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT event_object_table, trigger_name 
        FROM information_schema.triggers 
        WHERE trigger_name LIKE '%user%' 
           OR action_statement LIKE '%user_profiles%'
           OR action_statement LIKE '%auth.users%'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name || ' ON ' || trigger_record.event_object_table || ' CASCADE';
    END LOOP;
END $$;

-- STEP 8: Final check for any remaining triggers that might interfere
SELECT 
    'All remaining triggers that might interfere:' as info,
    trigger_schema,
    event_object_table,
    trigger_name
FROM information_schema.triggers 
WHERE trigger_name LIKE '%user%' 
   OR trigger_name LIKE '%profile%'
   OR trigger_name LIKE '%auth%'
   OR action_statement LIKE '%user_profiles%'
   OR action_statement LIKE '%auth.users%';

-- STEP 9: Clean up any remaining functions that might be problematic
DROP FUNCTION IF EXISTS get_user_role_safe(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_associated_client(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_user_profile_manual(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS sync_auth_users_to_profiles() CASCADE;
DROP FUNCTION IF EXISTS invite_user_safely(TEXT, TEXT, TEXT, TEXT) CASCADE;

SELECT 'All user-related triggers and functions removed!' as status;
SELECT 'Try creating a user now in Supabase Auth Dashboard' as instruction;
SELECT 'The user should be created in auth.users without any profile creation' as expected_result;