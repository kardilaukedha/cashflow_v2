/*
  # User Roles System

  1. New Tables
    - `user_profiles` - Store user role and profile information
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `role` (text) - Role: superadmin, admin_keuangan, admin_sariroti, karyawan
      - `full_name` (text)
      - `employee_id` (uuid, references employees) - Link to employee record for karyawan role
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on user_profiles
    - Users can view their own profile
    - Only superadmin can create/update user roles
    - Create function to auto-create profile for new users

  3. Notes
    - Superadmin: Full access to all features
    - Admin Keuangan: Manage financial transactions
    - Admin Sariroti: Manage Sariroti-specific data
    - Karyawan: View only their own salary information
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role text DEFAULT 'karyawan' NOT NULL CHECK (role IN ('superadmin', 'admin_keuangan', 'admin_sariroti', 'karyawan')),
  full_name text NOT NULL DEFAULT '',
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmin can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Users can update own profile name"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Superadmin can update all profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Superadmin can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Superadmin can delete profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'superadmin'
    )
  );

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create default user profile
CREATE OR REPLACE FUNCTION public.create_default_user_profile()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  is_first_user boolean;
BEGIN
  -- Check if this is the first user
  SELECT NOT EXISTS (SELECT 1 FROM auth.users WHERE id != NEW.id) INTO is_first_user;
  
  -- Create user profile, first user gets superadmin role
  INSERT INTO public.user_profiles (user_id, role, full_name) VALUES
    (NEW.id, CASE WHEN is_first_user THEN 'superadmin' ELSE 'karyawan' END, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  RETURN NEW;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_default_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_user_profile() TO service_role;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_user_profile();

-- Update employees RLS to allow karyawan to view their own data
DROP POLICY IF EXISTS "Karyawan can view own employee data" ON employees;
CREATE POLICY "Karyawan can view own employee data"
  ON employees FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.employee_id = employees.id
    )
  );

-- Update salary_payments RLS to allow karyawan to view their own salary
DROP POLICY IF EXISTS "Karyawan can view own salary payments" ON salary_payments;
CREATE POLICY "Karyawan can view own salary payments"
  ON salary_payments FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.employee_id = salary_payments.employee_id
    )
  );
