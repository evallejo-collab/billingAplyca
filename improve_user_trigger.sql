-- Improved trigger function that checks for pending invitations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Check if there's a pending invitation for this email
  UPDATE pending_invitations 
  SET status = 'accepted', accepted_at = NOW()
  WHERE email = NEW.email AND status = 'pending';

  -- Get invitation data for this email
  INSERT INTO public.user_profiles (
    id, 
    email, 
    full_name, 
    role, 
    client_id, 
    is_active,
    created_at,
    updated_at
  )
  SELECT 
    NEW.id,
    NEW.email,
    COALESCE(
      (SELECT full_name FROM pending_invitations WHERE email = NEW.email AND status = 'accepted' ORDER BY invited_at DESC LIMIT 1),
      NEW.raw_user_meta_data->>'full_name',
      'Usuario'
    ),
    COALESCE(
      (SELECT role FROM pending_invitations WHERE email = NEW.email AND status = 'accepted' ORDER BY invited_at DESC LIMIT 1),
      CASE 
        WHEN NEW.email = 'evallejo@aplyca.com' THEN 'admin'
        WHEN NEW.email = 'edwinvallejo@aplyca.com' THEN 'admin'
        ELSE 'collaborator'
      END
    ),
    (SELECT client_id FROM pending_invitations WHERE email = NEW.email AND status = 'accepted' ORDER BY invited_at DESC LIMIT 1),
    true,
    NOW(),
    NOW()
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    client_id = EXCLUDED.client_id,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();