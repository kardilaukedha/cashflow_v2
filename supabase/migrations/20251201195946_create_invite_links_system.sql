/*
  # Invite Links System
  
  1. New Tables
    - `invite_links` - Store generated invite links
      - `id` (uuid, primary key)
      - `created_by` (uuid, references auth.users) - Admin who created the link
      - `invite_token` (text, unique) - Unique token for the invite URL
      - `role` (text) - Role that will be assigned to new user
      - `max_uses` (integer) - Maximum number of times this link can be used
      - `current_uses` (integer) - Current number of times used
      - `expires_at` (timestamptz) - Expiration date (optional)
      - `is_active` (boolean) - Whether link is still active
      - `created_at` (timestamptz)
    
    - `invite_link_usage` - Track who used which invite link
      - `id` (uuid, primary key)
      - `invite_link_id` (uuid, references invite_links)
      - `used_by` (uuid, references auth.users) - User who registered with this link
      - `used_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Only authenticated admins can create/view invite links
    - Public can validate invite tokens (for registration)
*/

-- Create invite_links table
CREATE TABLE IF NOT EXISTS invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invite_token text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('superadmin', 'admin_keuangan', 'admin_sariroti', 'karyawan')),
  max_uses integer DEFAULT 1 NOT NULL CHECK (max_uses > 0),
  current_uses integer DEFAULT 0 NOT NULL,
  expires_at timestamptz,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create invite_link_usage table
CREATE TABLE IF NOT EXISTS invite_link_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_link_id uuid REFERENCES invite_links(id) ON DELETE CASCADE NOT NULL,
  used_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  used_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invite_links_token ON invite_links(invite_token);
CREATE INDEX IF NOT EXISTS idx_invite_links_created_by ON invite_links(created_by);
CREATE INDEX IF NOT EXISTS idx_invite_links_active ON invite_links(is_active);
CREATE INDEX IF NOT EXISTS idx_invite_link_usage_invite_id ON invite_link_usage(invite_link_id);
CREATE INDEX IF NOT EXISTS idx_invite_link_usage_used_by ON invite_link_usage(used_by);

-- Enable RLS
ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_link_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invite_links
-- Admins can view and manage invite links they created
CREATE POLICY "Users can view own invite links"
  ON invite_links FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can create invite links"
  ON invite_links FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own invite links"
  ON invite_links FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own invite links"
  ON invite_links FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- RLS Policies for invite_link_usage
CREATE POLICY "Users can view invite usage for their links"
  ON invite_link_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invite_links
      WHERE invite_links.id = invite_link_id
      AND invite_links.created_by = auth.uid()
    )
  );

-- Function to validate and use invite token
CREATE OR REPLACE FUNCTION public.validate_invite_token(token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
  result jsonb;
BEGIN
  -- Find the invite link
  SELECT * INTO invite_record
  FROM invite_links
  WHERE invite_token = token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND current_uses < max_uses;
  
  -- Check if invite exists and is valid
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Link undangan tidak valid atau sudah kadaluarsa'
    );
  END IF;
  
  -- Return valid invite info
  RETURN jsonb_build_object(
    'valid', true,
    'invite_id', invite_record.id,
    'role', invite_record.role,
    'remaining_uses', invite_record.max_uses - invite_record.current_uses
  );
END;
$$;

-- Function to mark invite as used
CREATE OR REPLACE FUNCTION public.mark_invite_used(token text, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_id uuid;
BEGIN
  -- Get invite ID
  SELECT id INTO invite_id
  FROM invite_links
  WHERE invite_token = token
    AND is_active = true
    AND current_uses < max_uses;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Increment usage count
  UPDATE invite_links
  SET current_uses = current_uses + 1
  WHERE id = invite_id;
  
  -- Record usage
  INSERT INTO invite_link_usage (invite_link_id, used_by)
  VALUES (invite_id, user_id);
  
  RETURN true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.validate_invite_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_invite_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.mark_invite_used(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_invite_used(text, uuid) TO service_role;
