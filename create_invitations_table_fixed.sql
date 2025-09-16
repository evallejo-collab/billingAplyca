-- Create table for pending invitations (fixed client_id type)
CREATE TABLE IF NOT EXISTS pending_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'collaborator', 'client')),
  client_id INTEGER REFERENCES clients(id),  -- Changed to INTEGER to match clients table
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pending_invitations_email ON pending_invitations(email);
CREATE INDEX IF NOT EXISTS idx_pending_invitations_status ON pending_invitations(status);

-- Enable RLS
ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all invitations" ON pending_invitations
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role = 'admin' 
      AND up.is_active = true
    )
  );

-- Function to update updated_at timestamp (only create if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_pending_invitations_updated_at ON pending_invitations;
CREATE TRIGGER update_pending_invitations_updated_at 
  BEFORE UPDATE ON pending_invitations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();