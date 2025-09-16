-- Remove ALL triggers that could be interfering with user creation

-- STEP 1: List all triggers first to see what we're dealing with
SELECT 
    schemaname,
    tablename,
    triggername,
    triggerdef
FROM pg_triggers 
WHERE triggername LIKE '%user%' 
   OR triggername LIKE '%profile%'
   OR triggername LIKE '%auth%'
   OR tablename = 'users'
   OR tablename LIKE '%user%';

-- STEP 2: Drop ALL triggers on auth.users table
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

-- STEP 4: Check if there are any other triggers we missed
SELECT 
    'Remaining triggers on auth.users:' as info,
    triggername,
    triggerdef
FROM pg_triggers 
WHERE schemaname = 'auth' AND tablename = 'users';

-- STEP 5: Also check for any triggers on user_profiles
SELECT 
    'Triggers on user_profiles:' as info,
    triggername,
    triggerdef
FROM pg_triggers 
WHERE tablename = 'user_profiles';

-- STEP 6: Drop any triggers on user_profiles too
DO $$ 
DECLARE 
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT triggername 
        FROM pg_triggers 
        WHERE tablename = 'user_profiles'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.triggername || ' ON user_profiles CASCADE';
    END LOOP;
END $$;

-- STEP 7: Check for any webhook or edge function triggers
-- These might be interfering from Supabase's side
SELECT 
    'All remaining triggers that might interfere:' as info,
    schemaname,
    tablename,
    triggername
FROM pg_triggers 
WHERE triggername LIKE '%user%' 
   OR triggername LIKE '%profile%'
   OR triggername LIKE '%auth%';

-- STEP 8: Completely clean slate - no triggers at all
SELECT 'All user-related triggers removed!' as status;
SELECT 'Try creating a user now in Supabase Auth Dashboard' as instruction;
SELECT 'User profiles will need to be created manually for now' as note;