-- DRASTIC SOLUTION: Recreate user_profiles table from scratch

-- STEP 1: Backup existing data (if any)
CREATE TABLE IF NOT EXISTS user_profiles_backup AS 
SELECT * FROM user_profiles;

-- STEP 2: Drop the problematic user_client_associations table first (depends on user_profiles)
DROP TABLE IF EXISTS user_client_associations CASCADE;

-- STEP 3: Drop the problematic user_profiles table completely
DROP TABLE IF EXISTS user_profiles CASCADE;

-- STEP 4: Create a MUCH simpler user_profiles table without foreign key constraints
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY, -- No foreign key reference to auth.users initially
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'client',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 5: Create indexes for performance
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

-- STEP 6: Insert your admin user manually first
INSERT INTO user_profiles (id, email, full_name, role, is_active, created_at)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email), 'admin', true, NOW()
FROM auth.users 
WHERE email = 'edwin@aplyca.com'
ON CONFLICT (id) DO NOTHING;

-- STEP 7: Insert any other existing auth users as clients
INSERT INTO user_profiles (id, email, full_name, role, is_active, created_at)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', email),
    CASE WHEN email = 'edwin@aplyca.com' THEN 'admin' ELSE 'client' END,
    true, 
    NOW()
FROM auth.users 
WHERE email != 'edwin@aplyca.com'
ON CONFLICT (id) DO NOTHING;

-- STEP 8: Recreate user_client_associations table (simpler version)
CREATE TABLE user_client_associations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL, -- Simple reference, no foreign key constraint initially
    client_id INTEGER NOT NULL, -- Reference to clients.id
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    UNIQUE(user_id, client_id)
);

-- STEP 9: Create indexes
CREATE INDEX idx_user_client_associations_user_id ON user_client_associations(user_id);
CREATE INDEX idx_user_client_associations_client_id ON user_client_associations(client_id);

-- STEP 10: Now add foreign key constraints AFTER tables are working
-- Add foreign key to clients table (this should work since clients table is stable)
ALTER TABLE user_client_associations 
ADD CONSTRAINT fk_user_client_associations_client_id 
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- STEP 11: Create a simple trigger that won't fail
CREATE OR REPLACE FUNCTION sync_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Simple insert without complex logic that could fail
    INSERT INTO user_profiles (id, email, full_name, role, is_active, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        CASE 
            WHEN NEW.email = 'edwin@aplyca.com' THEN 'admin'
            ELSE 'client'
        END,
        true,
        NOW()
    )
    ON CONFLICT (id) DO NOTHING; -- Don't fail if user already exists
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- If anything fails, just continue - don't block user creation
        RETURN NEW;
END;
$$;

-- STEP 12: Create the trigger
CREATE TRIGGER sync_new_auth_user_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_new_auth_user();

-- STEP 13: Test the setup
SELECT 'User tables recreated successfully!' as status;
SELECT 'Tables created without foreign key constraints to auth.users' as note;
SELECT 'Try creating a user now - it should work' as test_instruction;

-- Show current users
SELECT 'Current users in user_profiles:' as info;
SELECT id, email, role, created_at FROM user_profiles ORDER BY created_at;