-- Update the correct admin email
UPDATE user_profiles 
SET role = 'admin', is_active = true 
WHERE email = 'evallejo@aplyca.com';

-- Also update the emergency fix function to use the correct email
DROP FUNCTION IF EXISTS is_admin();
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND au.email = 'evallejo@aplyca.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the update
SELECT id, email, role, is_active FROM user_profiles WHERE email = 'evallejo@aplyca.com';