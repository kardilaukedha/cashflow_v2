/*
  # Fix Visit Checkins Policies
  
  Memperbaiki policies untuk visit_checkins:
  - Users can manage own visit checkins (INSERT, UPDATE, DELETE)
  - Admins can view and manage all visit checkins
  
  ## Policies
  1. Users can insert own visit checkins
  2. Users can update own visit checkins
  3. Users can delete own visit checkins
  4. Admins can insert any visit checkins
  5. Admins can update all visit checkins
  6. Admins can delete all visit checkins
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage own visit checkins" ON visit_checkins;
DROP POLICY IF EXISTS "Admins can view all visit checkins" ON visit_checkins;

-- Users can read own visit checkins
CREATE POLICY "Users can read own visit checkins"
  ON visit_checkins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all visit checkins
CREATE POLICY "Admins can read all visit checkins"
  ON visit_checkins FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin_sariroti', 'superadmin')
  ));

-- Users can insert own visit checkins
CREATE POLICY "Users can insert own visit checkins"
  ON visit_checkins FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update own visit checkins
CREATE POLICY "Users can update own visit checkins"
  ON visit_checkins FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can update all visit checkins
CREATE POLICY "Admins can update all visit checkins"
  ON visit_checkins FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin_sariroti', 'superadmin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin_sariroti', 'superadmin')
  ));

-- Users can delete own visit checkins
CREATE POLICY "Users can delete own visit checkins"
  ON visit_checkins FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can delete all visit checkins
CREATE POLICY "Admins can delete all visit checkins"
  ON visit_checkins FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin_sariroti', 'superadmin')
  ));
