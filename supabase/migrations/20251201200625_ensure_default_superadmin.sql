/*
  # Ensure Default Superadmin
  
  1. Updates
    - Ensure admin@admin.com always has role 'superadmin'
    - Update full_name to 'Super Admin' if different
  
  2. Functions
    - Create trigger to prevent admin@admin.com role change
    - Auto-restore superadmin role if changed
*/

-- Update admin@admin.com to ensure it's superadmin
UPDATE user_profiles
SET 
  full_name = 'Super Admin',
  role = 'superadmin'
WHERE email = 'admin@admin.com';

-- Create function to protect admin@admin.com
CREATE OR REPLACE FUNCTION protect_superadmin()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent changing admin@admin.com role
  IF NEW.email = 'admin@admin.com' AND NEW.role != 'superadmin' THEN
    NEW.role := 'superadmin';
    NEW.full_name := 'Super Admin';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_protect_superadmin ON user_profiles;

-- Create trigger on update
CREATE TRIGGER trigger_protect_superadmin
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_superadmin();

-- Also create trigger for new auth user sign up
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- If user is admin@admin.com, auto-create superadmin profile
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;

-- Create trigger on auth.users for new signups
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_profile();
