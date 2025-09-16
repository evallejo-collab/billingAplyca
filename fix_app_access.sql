-- Fix app access by temporarily disabling RLS and checking data

-- STEP 1: Disable RLS on all tables temporarily
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_client_associations DISABLE ROW LEVEL SECURITY;

-- Disable on other tables if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'projects') THEN
    ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'time_entries') THEN
    ALTER TABLE time_entries DISABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'payments') THEN
    ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- STEP 2: Verify your data is still there
SELECT 'Checking data integrity:' as status;

SELECT 'Clients:' as table_name, COUNT(*) as count FROM clients;
SELECT 'Contracts:' as table_name, COUNT(*) as count FROM contracts;
SELECT 'User profiles:' as table_name, COUNT(*) as count FROM user_profiles;
SELECT 'Projects:' as table_name, COUNT(*) as count FROM projects WHERE EXISTS (SELECT FROM pg_tables WHERE tablename = 'projects');

-- STEP 3: Show some sample data to confirm it exists
SELECT 'Sample clients:' as info;
SELECT id, name, email FROM clients LIMIT 5;

SELECT 'Sample contracts:' as info;
SELECT id, contract_number, client_id FROM contracts LIMIT 5;

SELECT 'Sample user profiles:' as info;
SELECT id, email, role FROM user_profiles LIMIT 5;

SELECT 'RLS disabled - app should now show data' as final_status;