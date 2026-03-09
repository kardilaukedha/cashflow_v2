/*
  # Fix Invite Links Policies
  
  Memisahkan policies untuk invite_links agar lebih granular:
  - SELECT, INSERT, UPDATE, DELETE terpisah
  
  ## Changes
  - Drop policy lama yang menggunakan FOR ALL
  - Buat policies terpisah untuk setiap operation
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage invite links" ON invite_links;

-- Admins can read invite links
CREATE POLICY "Admins can read invite links"
  ON invite_links FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin_keuangan', 'admin_sariroti')
  ));

-- Admins can insert invite links
CREATE POLICY "Admins can insert invite links"
  ON invite_links FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin_keuangan', 'admin_sariroti')
  ));

-- Admins can update invite links
CREATE POLICY "Admins can update invite links"
  ON invite_links FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin_keuangan', 'admin_sariroti')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin_keuangan', 'admin_sariroti')
  ));

-- Admins can delete invite links
CREATE POLICY "Admins can delete invite links"
  ON invite_links FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'admin_keuangan', 'admin_sariroti')
  ));
