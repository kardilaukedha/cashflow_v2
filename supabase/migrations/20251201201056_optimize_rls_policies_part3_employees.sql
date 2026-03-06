/*
  # Optimize RLS Policies - Part 3 (Employees & Related)
  
  1. Changes
    - Optimize employee policies
    - Remove duplicate policies
    - Use SELECT subqueries for auth functions
*/

-- Drop old duplicate employee policies
DROP POLICY IF EXISTS "Users can view own employees" ON employees;
DROP POLICY IF EXISTS "Users can create own employees" ON employees;
DROP POLICY IF EXISTS "Users can update own employees" ON employees;
DROP POLICY IF EXISTS "Users can delete own employees" ON employees;
DROP POLICY IF EXISTS "Karyawan can view own employee data" ON employees;
DROP POLICY IF EXISTS "Superadmin can view all employees" ON employees;
DROP POLICY IF EXISTS "Superadmin can manage all employees" ON employees;

-- Create optimized employee policies
CREATE POLICY "Users can view employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
      AND up.employee_id = employees.id
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role = 'superadmin'
    )
  );

CREATE POLICY "Users can manage employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role = 'superadmin'
    )
  );

CREATE POLICY "Users can update employees"
  ON employees FOR UPDATE
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

CREATE POLICY "Users can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role = 'superadmin'
    )
  );
