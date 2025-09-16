-- Create profiles for auth users that don't have them, using only 'admin' role
INSERT INTO user_profiles (id, email, full_name, role, is_active, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  'admin',
  true,
  NOW()
FROM auth.users au 
LEFT JOIN user_profiles up ON au.id = up.id 
WHERE up.id IS NULL;

-- Verify all profiles exist now
SELECT 'FINAL USER PROFILES:' as info;
SELECT id, email, full_name, role, is_active, created_at FROM user_profiles ORDER BY created_at;