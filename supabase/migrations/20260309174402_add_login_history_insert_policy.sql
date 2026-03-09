/*
  # Add Login History Insert Policy
  
  Menambahkan policy untuk insert login history.
  
  ## Policies Added
  - Users can insert own login history
  - Admins can insert any login history
*/

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can insert own login history" ON login_history;
DROP POLICY IF EXISTS "Admins can insert login history" ON login_history;

-- Users can insert own login history
CREATE POLICY "Users can insert own login history"
  ON login_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can insert any login history
CREATE POLICY "Admins can insert login history"
  ON login_history FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin_keuangan', 'admin_sariroti')
  ));

-- Admins can read all login history
CREATE POLICY "Admins can read all login history"
  ON login_history FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin_keuangan', 'admin_sariroti')
  ));
