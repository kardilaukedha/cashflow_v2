/*
  # Add Missing Insert and Management Policies
  
  Menambahkan policies INSERT yang masih missing untuk berbagai tabel:
  - export_logs
  - bulk_operation_logs
  
  ## Changes
  - Menambahkan INSERT policies
  - Menambahkan admin management policies
*/

-- Export logs - add insert policy
CREATE POLICY "Users can insert own export logs"
  ON export_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all export logs"
  ON export_logs FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin_keuangan', 'admin_sariroti')
  ));

-- Bulk operation logs - add insert policy
CREATE POLICY "Users can insert own bulk operation logs"
  ON bulk_operation_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all bulk operation logs"
  ON bulk_operation_logs FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin_keuangan', 'admin_sariroti')
  ));

-- Invite link usage - add insert policy (for when invite is used)
CREATE POLICY "Anyone can insert invite link usage"
  ON invite_link_usage FOR INSERT
  TO authenticated
  WITH CHECK (true);
