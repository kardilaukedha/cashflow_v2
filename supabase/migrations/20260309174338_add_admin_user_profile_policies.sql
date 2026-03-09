/*
  # Add Admin User Profile Management Policies
  
  Menambahkan policies untuk admin agar bisa:
  1. Insert user profiles baru
  2. Update user profiles lain
  3. Delete user profiles
  
  ## Policies Added
  - Admins can insert user profiles
  - Admins can update all user profiles
  - Admins can delete user profiles
*/

-- Drop existing policies if any to recreate
DROP POLICY IF EXISTS "Admins can insert user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete user profiles" ON user_profiles;

-- Allow admins to insert new user profiles
CREATE POLICY "Admins can insert user profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.user_id = auth.uid() AND up.role IN ('superadmin', 'admin_keuangan', 'admin_sariroti')
  ));

-- Allow admins to update all user profiles
CREATE POLICY "Admins can update all user profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.user_id = auth.uid() AND up.role IN ('superadmin', 'admin_keuangan', 'admin_sariroti')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.user_id = auth.uid() AND up.role IN ('superadmin', 'admin_keuangan', 'admin_sariroti')
  ));

-- Allow admins to delete user profiles
CREATE POLICY "Admins can delete user profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.user_id = auth.uid() AND up.role IN ('superadmin', 'admin_keuangan', 'admin_sariroti')
  ));
