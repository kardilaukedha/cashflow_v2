/*
  # Fix Bread Scans Policies
  
  Memperbaiki policies untuk bread_scans:
  - Users can manage own bread scans (INSERT, UPDATE, DELETE)
  - Admins can view and manage all bread scans
  
  ## Policies
  1. Users can insert own bread scans
  2. Users can update own bread scans
  3. Users can delete own bread scans
  4. Admins can insert any bread scans
  5. Admins can update all bread scans
  6. Admins can delete all bread scans
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage own bread scans" ON bread_scans;
DROP POLICY IF EXISTS "Admins can view all bread scans" ON bread_scans;

-- Users can read own bread scans
CREATE POLICY "Users can read own bread scans"
  ON bread_scans FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all bread scans
CREATE POLICY "Admins can read all bread scans"
  ON bread_scans FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin_sariroti', 'superadmin')
  ));

-- Users can insert own bread scans
CREATE POLICY "Users can insert own bread scans"
  ON bread_scans FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update own bread scans
CREATE POLICY "Users can update own bread scans"
  ON bread_scans FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can update all bread scans
CREATE POLICY "Admins can update all bread scans"
  ON bread_scans FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin_sariroti', 'superadmin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin_sariroti', 'superadmin')
  ));

-- Users can delete own bread scans
CREATE POLICY "Users can delete own bread scans"
  ON bread_scans FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can delete all bread scans
CREATE POLICY "Admins can delete all bread scans"
  ON bread_scans FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin_sariroti', 'superadmin')
  ));
