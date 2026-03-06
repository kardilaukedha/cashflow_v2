/*
  # Fix Function Search Paths
  
  1. Changes
    - Set immutable search_path for all functions
    - This prevents security vulnerabilities from mutable search paths
    
  2. Functions Updated
    - update_updated_at_column
    - update_job_positions_updated_at
    - update_employee_loans_updated_at
    - get_user_email
    - set_user_profile_email
    - protect_superadmin
    - handle_new_user_profile
*/

-- Fix update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Fix update_job_positions_updated_at
CREATE OR REPLACE FUNCTION update_job_positions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Fix update_employee_loans_updated_at
CREATE OR REPLACE FUNCTION update_employee_loans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Fix get_user_email
CREATE OR REPLACE FUNCTION get_user_email(user_uuid uuid)
RETURNS text AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_uuid;
  
  RETURN user_email;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Fix set_user_profile_email
CREATE OR REPLACE FUNCTION set_user_profile_email()
RETURNS TRIGGER AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.user_id;
  
  NEW.email := user_email;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Fix protect_superadmin
CREATE OR REPLACE FUNCTION protect_superadmin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = 'admin@admin.com' AND NEW.role != 'superadmin' THEN
    NEW.role := 'superadmin';
    NEW.full_name := 'Super Admin';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Fix handle_new_user_profile
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = 'admin@admin.com' THEN
    INSERT INTO user_profiles (user_id, full_name, email, role)
    VALUES (NEW.id, 'Super Admin', 'admin@admin.com', 'superadmin')
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      full_name = 'Super Admin',
      email = 'admin@admin.com',
      role = 'superadmin';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Fix validate_invite_token (if exists)
CREATE OR REPLACE FUNCTION validate_invite_token(token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  invite_record RECORD;
BEGIN
  SELECT * INTO invite_record
  FROM invite_links
  WHERE invite_token = token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND current_uses < max_uses;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Link undangan tidak valid atau sudah kadaluarsa'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'invite_id', invite_record.id,
    'role', invite_record.role,
    'remaining_uses', invite_record.max_uses - invite_record.current_uses
  );
END;
$$;

-- Fix mark_invite_used (if exists)
CREATE OR REPLACE FUNCTION mark_invite_used(token text, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  invite_id uuid;
BEGIN
  SELECT id INTO invite_id
  FROM invite_links
  WHERE invite_token = token
    AND is_active = true
    AND current_uses < max_uses;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  UPDATE invite_links
  SET current_uses = current_uses + 1
  WHERE id = invite_id;
  
  INSERT INTO invite_link_usage (invite_link_id, used_by)
  VALUES (invite_id, user_id);
  
  RETURN true;
END;
$$;
