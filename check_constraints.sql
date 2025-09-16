-- Check the constraint on user_profiles table
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE t.relname = 'user_profiles' 
AND n.nspname = 'public';

-- Check the table structure
\d user_profiles;

-- Let's see what roles are currently in the table
SELECT DISTINCT role FROM user_profiles;

-- Try inserting with the correct role values
INSERT INTO user_profiles (id, email, full_name, role, is_active, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', 'Usuario Test'),
  CASE 
    WHEN au.email = 'edwinvallejo@aplyca.com' THEN 'admin'
    WHEN au.email LIKE '%edwin%' THEN 'admin'  -- Make other edwin accounts admin too
    ELSE 'admin'  -- Try admin for all for now
  END,
  true,
  NOW()
FROM auth.users au 
LEFT JOIN user_profiles up ON au.id = up.id 
WHERE up.id IS NULL;