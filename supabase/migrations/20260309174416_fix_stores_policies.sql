/*
  # Fix Stores Table Policies
  
  Memperbaiki policies untuk stores agar lebih detail:
  - Separate policies untuk SELECT, INSERT, UPDATE, DELETE
  - Karyawan sariroti bisa manage stores mereka sendiri
  - Admin sariroti bisa manage semua stores
  
  ## Policies
  1. Sariroti staff can read stores
  2. Sariroti staff can insert stores
  3. Sariroti staff can update own stores
  4. Admins can update all stores
  5. Admins can delete stores
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Sariroti staff can manage stores" ON stores;

-- Sariroti staff can read all stores
CREATE POLICY "Sariroti staff can read stores"
  ON stores FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin_sariroti', 'karyawan_sariroti', 'superadmin')
  ));

-- Sariroti staff can insert stores
CREATE POLICY "Sariroti staff can insert stores"
  ON stores FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin_sariroti', 'karyawan_sariroti', 'superadmin')
  ));

-- Karyawan can update own stores
CREATE POLICY "Karyawan can update own stores"
  ON stores FOR UPDATE
  TO authenticated
  USING (
    user_profile_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    user_profile_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
  );

-- Admins can update all stores
CREATE POLICY "Admins can update all stores"
  ON stores FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin_sariroti', 'superadmin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin_sariroti', 'superadmin')
  ));

-- Admins can delete stores
CREATE POLICY "Admins can delete stores"
  ON stores FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin_sariroti', 'superadmin')
  ));
