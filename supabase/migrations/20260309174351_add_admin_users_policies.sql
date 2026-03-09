/*
  # Add Admin Users Management Policies
  
  Menambahkan policies untuk admin agar bisa:
  1. Read semua users
  2. Insert users baru
  3. Update users
  4. Delete users
  
  ## Policies Added
  - Admins can read all users
  - Admins can insert users
  - Admins can update users
  - Admins can delete users
*/

-- Drop existing policy if any
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;

-- Users can read own data
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admins can read all users
CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin_keuangan', 'admin_sariroti')
  ));

-- Admins can insert users
CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin_keuangan', 'admin_sariroti')
  ));

-- Admins can update users
CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin_keuangan', 'admin_sariroti')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin_keuangan', 'admin_sariroti')
  ));

-- Admins can delete users
CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin_keuangan', 'admin_sariroti')
  ));
