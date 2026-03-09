/*
  # Fix User Profiles for Supabase Auth
  
  1. Changes
    - Update user_profiles to reference auth.users instead of public.users
    - Update admin user_profile to use auth.users ID
    
  2. Notes
    - Switching from custom Express auth to Supabase Auth
    - user_profiles.user_id now references auth.users.id
*/

-- Update the admin profile to use auth.users ID
UPDATE user_profiles 
SET user_id = (SELECT id FROM auth.users WHERE email = 'admin@admin.com' LIMIT 1)
WHERE full_name = 'Super Admin';

-- Add FK constraint to auth.users (without validation for existing data)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_auth_user_id_fkey'
  ) THEN
    ALTER TABLE user_profiles 
    ADD CONSTRAINT user_profiles_auth_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
    NOT VALID;
  END IF;
END $$;