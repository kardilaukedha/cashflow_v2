/*
  # Optimize RLS Policies - Part 5 (User Profiles)
  
  1. Changes
    - Optimize user profile policies
    - Remove duplicate policies
    - Use SELECT subqueries for auth functions
*/

-- Drop old duplicate user profile policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Superadmin can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile name" ON user_profiles;
DROP POLICY IF EXISTS "Superadmin can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Superadmin can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Superadmin can delete profiles" ON user_profiles;

-- Create optimized user profile policies
CREATE POLICY "Users can view profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
      AND up.role = 'superadmin'
    )
  );

CREATE POLICY "Users can update profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
      AND up.role = 'superadmin'
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
      AND up.role = 'superadmin'
    )
  );

CREATE POLICY "Superadmin can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role = 'superadmin'
    )
  );

CREATE POLICY "Superadmin can delete profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
      AND up.role = 'superadmin'
    )
  );
