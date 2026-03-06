/*
  # Optimize RLS Policies - Part 2 (Transactions)
  
  1. Changes
    - Optimize transaction policies
    - Remove duplicate policies
    - Use SELECT subqueries for auth functions
*/

-- Drop old duplicate transaction policies
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can create own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view own transactions or superadmin sees all" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions or superadmin updates all" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions or superadmin deletes all" ON transactions;

-- Create optimized transaction policies (keeping superadmin access)
CREATE POLICY "Users can view own transactions or superadmin sees all"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role = 'superadmin'
    )
  );

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own transactions or superadmin updates all"
  ON transactions FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role = 'superadmin'
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role = 'superadmin'
    )
  );

CREATE POLICY "Users can delete own transactions or superadmin deletes all"
  ON transactions FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role = 'superadmin'
    )
  );
