/*
  # Fix Visit Plans Policies
  
  Memperbaiki policies untuk visit_plans:
  - Users can manage own visit plans (INSERT, UPDATE, DELETE)
  - Admins can view and manage all visit plans
  
  ## Policies
  1. Users can insert own visit plans
  2. Users can update own visit plans
  3. Users can delete own visit plans
  4. Admins can insert any visit plans
  5. Admins can update all visit plans
  6. Admins can delete all visit plans
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage own visit plans" ON visit_plans;
DROP POLICY IF EXISTS "Admins can view all visit plans" ON visit_plans;

-- Users can read own visit plans
CREATE POLICY "Users can read own visit plans"
  ON visit_plans FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all visit plans
CREATE POLICY "Admins can read all visit plans"
  ON visit_plans FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin_sariroti', 'superadmin')
  ));

-- Users can insert own visit plans
CREATE POLICY "Users can insert own visit plans"
  ON visit_plans FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update own visit plans
CREATE POLICY "Users can update own visit plans"
  ON visit_plans FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can update all visit plans
CREATE POLICY "Admins can update all visit plans"
  ON visit_plans FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin_sariroti', 'superadmin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin_sariroti', 'superadmin')
  ));

-- Users can delete own visit plans
CREATE POLICY "Users can delete own visit plans"
  ON visit_plans FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can delete all visit plans
CREATE POLICY "Admins can delete all visit plans"
  ON visit_plans FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin_sariroti', 'superadmin')
  ));
