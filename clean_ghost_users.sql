-- Clean up ghost users and investigate auth.users table

-- STEP 1: Check ALL users in auth.users (including deleted ones)
SELECT 
    id, 
    email, 
    created_at,
    updated_at,
    email_confirmed_at,
    deleted_at,
    is_sso_user,
    raw_user_meta_data
FROM auth.users 
ORDER BY created_at DESC;

-- STEP 2: Check for users that might be soft-deleted (deleted_at is not null)
SELECT 
    'Soft-deleted users:' as info,
    id, 
    email, 
    deleted_at,
    created_at
FROM auth.users 
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC;

-- STEP 3: Check for users with unconfirmed emails
SELECT 
    'Unconfirmed users:' as info,
    id, 
    email, 
    email_confirmed_at,
    created_at
FROM auth.users 
WHERE email_confirmed_at IS NULL
ORDER BY created_at DESC;

-- STEP 4: Hard delete any soft-deleted users (be careful!)
-- UNCOMMENT ONLY IF YOU WANT TO PERMANENTLY DELETE SOFT-DELETED USERS
-- DELETE FROM auth.users WHERE deleted_at IS NOT NULL;

-- STEP 5: Check auth.identities table (might contain ghost identities)
SELECT 
    'Identities in auth.identities:' as info,
    id,
    user_id,
    identity_data->>'email' as email,
    provider,
    created_at,
    updated_at
FROM auth.identities 
ORDER BY created_at DESC;

-- STEP 6: Check for orphaned identities (identities without users)
SELECT 
    'Orphaned identities:' as info,
    i.id,
    i.user_id,
    i.identity_data->>'email' as email,
    i.provider
FROM auth.identities i
LEFT JOIN auth.users u ON i.user_id = u.id
WHERE u.id IS NULL;

-- STEP 7: Clean up orphaned identities
-- UNCOMMENT TO DELETE ORPHANED IDENTITIES
-- DELETE FROM auth.identities 
-- WHERE user_id NOT IN (SELECT id FROM auth.users);

-- STEP 8: Check auth.sessions table for ghost sessions
SELECT 
    'Active sessions:' as info,
    id,
    user_id,
    created_at,
    updated_at
FROM auth.sessions 
ORDER BY updated_at DESC 
LIMIT 10;

-- STEP 9: Show a safe way to test with a completely new email
SELECT 'Try creating a user with a completely new email like:' as suggestion;
SELECT 'test' || floor(random() * 10000) || '@example.com' as suggested_email;

-- STEP 10: Create a function to safely clean up a specific user
CREATE OR REPLACE FUNCTION force_delete_user(user_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_uuid UUID;
    result_text TEXT;
BEGIN
    -- Get user ID
    SELECT id INTO user_uuid FROM auth.users WHERE email = user_email;
    
    IF user_uuid IS NULL THEN
        RETURN 'User not found: ' || user_email;
    END IF;
    
    -- Delete from auth.identities first
    DELETE FROM auth.identities WHERE user_id = user_uuid;
    
    -- Delete from auth.sessions
    DELETE FROM auth.sessions WHERE user_id = user_uuid;
    
    -- Delete from user_profiles if exists
    DELETE FROM user_profiles WHERE id = user_uuid;
    
    -- Finally delete from auth.users
    DELETE FROM auth.users WHERE id = user_uuid;
    
    RETURN 'Successfully deleted user: ' || user_email || ' (ID: ' || user_uuid || ')';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Error deleting user: ' || SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION force_delete_user TO authenticated;

SELECT 'Diagnosis complete!' as status;
SELECT 'Check the output above for ghost users' as instruction_1;
SELECT 'Use force_delete_user(email) to clean up specific users if needed' as instruction_2;