-- Create user profile for the admin user
INSERT INTO public.user_profiles (id, full_name, username, role) 
VALUES (
  '9eb0d9d2-ba83-4f5f-a211-d24b0cc07af1'::uuid,
  'Administrador',
  'admin',
  'admin'
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  username = EXCLUDED.username,
  role = EXCLUDED.role;