-- Drop the existing role constraint
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Add a new constraint that allows admin, collaborator, and client
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('admin', 'collaborator', 'client'));

-- Now update some users to have different roles for testing
-- Keep your main account as admin
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'edwinvallejo@aplyca.com';

-- Set other users as collaborators (you can change these as needed)
UPDATE user_profiles 
SET role = 'collaborator' 
WHERE email != 'edwinvallejo@aplyca.com' 
AND email NOT LIKE '%test%';

-- Verify the changes
SELECT email, role, is_active FROM user_profiles ORDER BY email;