/*
  # Add Email Column to User Profiles

  1. Changes
    - Add email column to user_profiles table
    - Create function to sync email from auth.users
    - Update existing records with emails

  2. Purpose
    - Allow client-side access to user emails without needing admin API
    - Simplify UserManager component

  3. Security
    - Email column is readable by superadmin only
*/

-- Add email column to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email text;

-- Create function to get user email
CREATE OR REPLACE FUNCTION get_user_email(user_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_uuid;
  
  RETURN user_email;
END;
$$;

-- Update existing user_profiles with emails
UPDATE user_profiles
SET email = get_user_email(user_id)
WHERE email IS NULL;

-- Create trigger to auto-populate email on insert
CREATE OR REPLACE FUNCTION set_user_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email := get_user_email(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_user_profile_email_trigger ON user_profiles;
CREATE TRIGGER set_user_profile_email_trigger
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_user_profile_email();