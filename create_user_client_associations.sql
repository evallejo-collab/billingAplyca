-- Create table to associate users with specific clients
CREATE TABLE IF NOT EXISTS user_client_associations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_by UUID REFERENCES user_profiles(id),
  is_active BOOLEAN DEFAULT true,
  
  -- Ensure a user can only be associated with one client (unless they're admin)
  UNIQUE(user_id, client_id)
);

-- Enable RLS on the new table
ALTER TABLE user_client_associations ENABLE ROW LEVEL SECURITY;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_client_associations_user_id ON user_client_associations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_client_associations_client_id ON user_client_associations(client_id);

-- RLS Policies for user_client_associations
CREATE POLICY "Users can view their own client associations" ON user_client_associations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all client associations" ON user_client_associations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert client associations" ON user_client_associations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update client associations" ON user_client_associations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete client associations" ON user_client_associations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Update RLS policies for clients table to restrict access based on associations
-- Drop existing policies if they exist (be careful with this in production)
DROP POLICY IF EXISTS "Users can view all clients" ON clients;
DROP POLICY IF EXISTS "Admins can view all clients" ON clients;

-- Create new restrictive policies for clients
CREATE POLICY "Admins can view all clients" ON clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Associated users can view their client" ON clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_client_associations uca
      JOIN user_profiles up ON up.id = uca.user_id
      WHERE uca.client_id = clients.id 
      AND uca.user_id = auth.uid()
      AND uca.is_active = true
      AND up.role != 'admin'
    )
  );

-- Update RLS policies for contracts table to restrict access based on client associations
DROP POLICY IF EXISTS "Users can view all contracts" ON contracts;
DROP POLICY IF EXISTS "Admins can view all contracts" ON contracts;

CREATE POLICY "Admins can view all contracts" ON contracts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Associated users can view contracts of their client" ON contracts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_client_associations uca
      JOIN user_profiles up ON up.id = uca.user_id
      WHERE uca.client_id = contracts.client_id 
      AND uca.user_id = auth.uid()
      AND uca.is_active = true
      AND up.role != 'admin'
    )
  );

-- Update RLS policies for projects table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'projects') THEN
    DROP POLICY IF EXISTS "Users can view all projects" ON projects;
    DROP POLICY IF EXISTS "Admins can view all projects" ON projects;
    
    EXECUTE 'CREATE POLICY "Admins can view all projects" ON projects
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE id = auth.uid() AND role = ''admin''
        )
      )';
    
    EXECUTE 'CREATE POLICY "Associated users can view projects of their client" ON projects
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM user_client_associations uca
          JOIN user_profiles up ON up.id = uca.user_id
          WHERE uca.client_id = projects.client_id 
          AND uca.user_id = auth.uid()
          AND uca.is_active = true
          AND up.role != ''admin''
        )
      )';
  END IF;
END $$;

-- Update RLS policies for time_entries table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'time_entries') THEN
    DROP POLICY IF EXISTS "Users can view all time entries" ON time_entries;
    DROP POLICY IF EXISTS "Admins can view all time entries" ON time_entries;
    
    EXECUTE 'CREATE POLICY "Admins can view all time entries" ON time_entries
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE id = auth.uid() AND role = ''admin''
        )
      )';
    
    EXECUTE 'CREATE POLICY "Associated users can view time entries of their client" ON time_entries
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM user_client_associations uca
          JOIN user_profiles up ON up.id = uca.user_id
          JOIN contracts c ON c.id = time_entries.contract_id
          WHERE uca.client_id = c.client_id 
          AND uca.user_id = auth.uid()
          AND uca.is_active = true
          AND up.role != ''admin''
        )
      )';
  END IF;
END $$;

-- Update RLS policies for payments table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'payments') THEN
    DROP POLICY IF EXISTS "Users can view all payments" ON payments;
    DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
    
    EXECUTE 'CREATE POLICY "Admins can view all payments" ON payments
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE id = auth.uid() AND role = ''admin''
        )
      )';
    
    EXECUTE 'CREATE POLICY "Associated users can view payments of their client" ON payments
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM user_client_associations uca
          JOIN user_profiles up ON up.id = uca.user_id
          JOIN contracts c ON c.id = payments.contract_id
          WHERE uca.client_id = c.client_id 
          AND uca.user_id = auth.uid()
          AND uca.is_active = true
          AND up.role != ''admin''
        )
      )';
  END IF;
END $$;

-- Create a function to get user's associated client
CREATE OR REPLACE FUNCTION get_user_associated_client(user_uuid UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  client_uuid UUID;
  user_role TEXT;
BEGIN
  -- Check if user is admin (admins don't have client restrictions)
  SELECT role INTO user_role 
  FROM user_profiles 
  WHERE id = user_uuid;
  
  IF user_role = 'admin' THEN
    RETURN NULL; -- NULL means no restriction for admin
  END IF;
  
  -- Get the client_id for non-admin users
  SELECT uca.client_id INTO client_uuid
  FROM user_client_associations uca
  WHERE uca.user_id = user_uuid 
  AND uca.is_active = true
  LIMIT 1;
  
  RETURN client_uuid;
END;
$$;

COMMENT ON FUNCTION get_user_associated_client IS 'Returns the client_id associated with a user, or NULL if user is admin';

-- Create a view for easier client portal access
CREATE OR REPLACE VIEW user_client_portal AS
SELECT 
  up.id as user_id,
  up.email,
  up.full_name,
  up.role,
  c.id as client_id,
  c.name as client_name,
  c.email as client_email,
  uca.created_at as association_created,
  uca.is_active as association_active
FROM user_profiles up
LEFT JOIN user_client_associations uca ON up.id = uca.user_id AND uca.is_active = true
LEFT JOIN clients c ON uca.client_id = c.id
WHERE up.id = auth.uid();

-- Grant access to the view
GRANT SELECT ON user_client_portal TO authenticated;

-- Add some sample data for testing (optional - you can remove this if not needed)
INSERT INTO user_profiles (id, email, full_name, role, is_active, created_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111'::UUID, 'client1@example.com', 'Cliente Uno', 'client', true, NOW()),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'client2@example.com', 'Cliente Dos', 'client', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- Display current setup
SELECT 'USER CLIENT ASSOCIATIONS SETUP COMPLETED' as status;
SELECT 'To associate a user with a client, use:' as instruction;
SELECT 'INSERT INTO user_client_associations (user_id, client_id, created_by) VALUES (user_uuid, client_uuid, admin_uuid);' as example;