/*
  # Optimize RLS Policies - Part 6 (Job Positions & Loans)
  
  1. Changes
    - Optimize job position and employee loan policies
    - Remove duplicate policies
    - Use SELECT subqueries for auth functions
*/

-- Drop old duplicate job position policies
DROP POLICY IF EXISTS "Superadmin can do everything with job positions" ON job_positions;
DROP POLICY IF EXISTS "Admin keuangan can manage job positions" ON job_positions;
DROP POLICY IF EXISTS "Admin sariroti can view job positions" ON job_positions;
DROP POLICY IF EXISTS "Karyawan can view job positions" ON job_positions;
DROP POLICY IF EXISTS "Superadmin can view all job positions" ON job_positions;

-- Create optimized job position policies
CREATE POLICY "Users can view job positions"
  ON job_positions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Admins can manage job positions"
  ON job_positions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role IN ('superadmin', 'admin_keuangan')
    )
  );

CREATE POLICY "Admins can update job positions"
  ON job_positions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role IN ('superadmin', 'admin_keuangan')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role IN ('superadmin', 'admin_keuangan')
    )
  );

CREATE POLICY "Admins can delete job positions"
  ON job_positions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role IN ('superadmin', 'admin_keuangan')
    )
  );

-- Drop old duplicate employee loan policies
DROP POLICY IF EXISTS "Superadmin can do everything with loans" ON employee_loans;
DROP POLICY IF EXISTS "Admin keuangan can manage loans" ON employee_loans;
DROP POLICY IF EXISTS "Admin sariroti can view loans" ON employee_loans;
DROP POLICY IF EXISTS "Karyawan can view own loans" ON employee_loans;
DROP POLICY IF EXISTS "Superadmin can view all loans" ON employee_loans;

-- Create optimized employee loan policies
CREATE POLICY "Users can view loans"
  ON employee_loans FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM employees e
      INNER JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = (SELECT auth.uid())
      AND e.id = employee_loans.employee_id
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role IN ('superadmin', 'admin_keuangan', 'admin_sariroti')
    )
  );

CREATE POLICY "Admins can manage loans"
  ON employee_loans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role IN ('superadmin', 'admin_keuangan')
    )
  );

CREATE POLICY "Admins can update loans"
  ON employee_loans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role IN ('superadmin', 'admin_keuangan')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role IN ('superadmin', 'admin_keuangan')
    )
  );

CREATE POLICY "Admins can delete loans"
  ON employee_loans FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
      AND user_profiles.role IN ('superadmin', 'admin_keuangan')
    )
  );
