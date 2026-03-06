/*
  # Optimize RLS Policies - Part 4 (Salary Payments)
  
  1. Changes
    - Optimize salary payment policies
    - Remove duplicate policies
    - Use SELECT subqueries for auth functions
*/

-- Drop old duplicate salary payment policies
DROP POLICY IF EXISTS "Users can view own salary payments" ON salary_payments;
DROP POLICY IF EXISTS "Users can create own salary payments" ON salary_payments;
DROP POLICY IF EXISTS "Users can update own salary payments" ON salary_payments;
DROP POLICY IF EXISTS "Users can delete own salary payments" ON salary_payments;
DROP POLICY IF EXISTS "Karyawan can view own salary payments" ON salary_payments;
DROP POLICY IF EXISTS "Superadmin can view all salary payments" ON salary_payments;
DROP POLICY IF EXISTS "Superadmin can manage all salary payments" ON salary_payments;

-- Create optimized salary payment policies
CREATE POLICY "Users can view salary payments"
  ON salary_payments FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM employees e
      INNER JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = (SELECT auth.uid())
      AND e.id = salary_payments.employee_id
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role = 'superadmin'
    )
  );

CREATE POLICY "Users can create salary payments"
  ON salary_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role = 'superadmin'
    )
  );

CREATE POLICY "Users can update salary payments"
  ON salary_payments FOR UPDATE
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

CREATE POLICY "Users can delete salary payments"
  ON salary_payments FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role = 'superadmin'
    )
  );
