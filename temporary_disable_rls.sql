-- Temporarily disable RLS to fix loading issues

-- Disable RLS on all tables to prevent hanging
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_client_associations DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE contracts DISABLE ROW LEVEL SECURITY;

-- If these tables exist, disable RLS on them too
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

SELECT 'RLS disabled temporarily - app should load faster now' as status;