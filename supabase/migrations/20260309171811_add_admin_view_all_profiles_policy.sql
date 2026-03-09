/*
  # Add admin view-all policy for user_profiles

  1. Security Changes
    - Add SELECT policy for admin_keuangan and admin_sariroti roles
      to view all user profiles (needed for employee management,
      laporan, and performa pages)

  2. Important Notes
    - Superadmin already has full access via existing policy
    - This only grants SELECT (read) access, not write access
    - Admin roles still cannot modify other users' profiles
*/

CREATE POLICY "Admin roles can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up2
      WHERE up2.user_id = auth.uid()
      AND up2.role IN ('admin_keuangan', 'admin_sariroti')
    )
  );
