-- Set your account as admin
UPDATE user_profiles 
SET role = 'admin', is_active = true 
WHERE email = 'edwinvallejo@aplyca.com';

-- Verify your role is now admin
SELECT email, role, is_active FROM user_profiles WHERE email = 'edwinvallejo@aplyca.com';

-- Show all users and their roles
SELECT email, role, is_active, created_at FROM user_profiles ORDER BY created_at;