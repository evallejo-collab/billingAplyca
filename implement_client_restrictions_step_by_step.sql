-- Step-by-step implementation of client restrictions

-- STEP 1: Create profiles for all existing auth users
INSERT INTO user_profiles (id, email, full_name, role, is_active, created_at)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', email),
    CASE 
        WHEN email = 'edwin@aplyca.com' THEN 'admin'
        ELSE 'client'
    END,
    true, 
    NOW()
FROM auth.users 
WHERE deleted_at IS NULL
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

-- STEP 2: Show current users
SELECT 'Current user profiles:' as info;
SELECT id, email, role, created_at FROM user_profiles ORDER BY created_at;

-- STEP 3: Enable simple RLS on user_profiles first
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create basic policies for user_profiles (non-recursive)
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Admin policy using direct email check (no recursion)
CREATE POLICY "Admin full access" ON user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND email = 'edwin@aplyca.com'
            AND deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND email = 'edwin@aplyca.com'
            AND deleted_at IS NULL
        )
    );

-- STEP 4: Enable RLS on user_client_associations
ALTER TABLE user_client_associations ENABLE ROW LEVEL SECURITY;

-- Users can see their own associations
CREATE POLICY "Users can view own associations" ON user_client_associations
    FOR SELECT USING (user_id = auth.uid());

-- Admin can manage all associations
CREATE POLICY "Admin can manage associations" ON user_client_associations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND email = 'edwin@aplyca.com'
            AND deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND email = 'edwin@aplyca.com'
            AND deleted_at IS NULL
        )
    );

-- STEP 5: Enable RLS on clients table with restrictions
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Admin can see all clients
CREATE POLICY "Admin can view all clients" ON clients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND email = 'edwin@aplyca.com'
            AND deleted_at IS NULL
        )
    );

-- Users can only see their associated client
CREATE POLICY "Users can view associated client" ON clients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_client_associations uca
            WHERE uca.client_id = clients.id 
            AND uca.user_id = auth.uid()
            AND uca.is_active = true
        )
    );

-- STEP 6: Enable RLS on contracts table with restrictions
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Admin can see all contracts
CREATE POLICY "Admin can view all contracts" ON contracts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND email = 'edwin@aplyca.com'
            AND deleted_at IS NULL
        )
    );

-- Users can only see contracts of their associated client
CREATE POLICY "Users can view associated client contracts" ON contracts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_client_associations uca
            WHERE uca.client_id = contracts.client_id 
            AND uca.user_id = auth.uid()
            AND uca.is_active = true
        )
    );

-- STEP 7: Enable RLS on projects table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'projects') THEN
        ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
        
        -- Admin can see all projects
        CREATE POLICY "Admin can view all projects" ON projects
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM auth.users 
                    WHERE id = auth.uid() 
                    AND email = 'edwin@aplyca.com'
                    AND deleted_at IS NULL
                )
            );
        
        -- Users can only see projects of their associated client
        CREATE POLICY "Users can view associated client projects" ON projects
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM user_client_associations uca
                    WHERE uca.client_id = projects.client_id 
                    AND uca.user_id = auth.uid()
                    AND uca.is_active = true
                )
            );
    END IF;
END $$;

-- STEP 8: Enable RLS on time_entries table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'time_entries') THEN
        ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
        
        -- Admin can see all time entries
        CREATE POLICY "Admin can view all time_entries" ON time_entries
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM auth.users 
                    WHERE id = auth.uid() 
                    AND email = 'edwin@aplyca.com'
                    AND deleted_at IS NULL
                )
            );
        
        -- Users can only see time entries of their associated client's contracts
        CREATE POLICY "Users can view associated client time_entries" ON time_entries
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM user_client_associations uca
                    JOIN contracts c ON c.client_id = uca.client_id
                    WHERE c.id = time_entries.contract_id 
                    AND uca.user_id = auth.uid()
                    AND uca.is_active = true
                )
            );
    END IF;
END $$;

-- STEP 9: Enable RLS on payments table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'payments') THEN
        ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
        
        -- Admin can see all payments
        CREATE POLICY "Admin can view all payments" ON payments
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM auth.users 
                    WHERE id = auth.uid() 
                    AND email = 'edwin@aplyca.com'
                    AND deleted_at IS NULL
                )
            );
        
        -- Users can only see payments of their associated client's contracts
        CREATE POLICY "Users can view associated client payments" ON payments
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM user_client_associations uca
                    JOIN contracts c ON c.client_id = uca.client_id
                    WHERE c.id = payments.contract_id 
                    AND uca.user_id = auth.uid()
                    AND uca.is_active = true
                )
            );
    END IF;
END $$;

-- STEP 10: Create a simple trigger to automatically create profiles for new users
CREATE OR REPLACE FUNCTION auto_create_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail user creation if profile creation fails
        RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER auto_create_user_profile_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_user_profile();

-- STEP 11: Final status
SELECT 'Client restrictions implemented successfully!' as status;
SELECT 'Next steps:' as next_steps;
SELECT '1. Create user-client associations via the web interface' as step_1;
SELECT '2. Test client access in the ClientPortal' as step_2;
SELECT '3. Non-admin users will only see their associated client data' as step_3;