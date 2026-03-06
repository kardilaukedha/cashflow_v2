/*
  # Fix RLS Policies for Superadmin Access

  1. Changes
    - Add superadmin bypass policies for employees, job_positions, employee_loans
    - Ensure superadmin can see all data regardless of user_id

  2. Purpose
    - Allow superadmin to manage all data in the system
    - Fix issue where data doesn't show because of user_id mismatch

  3. Security
    - Only users with superadmin role can bypass user_id checks
    - Other roles still restricted to their own data
*/

-- Drop and recreate policies for employees with superadmin bypass
DROP POLICY IF EXISTS "Superadmin can view all employees" ON employees;
CREATE POLICY "Superadmin can view all employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "Superadmin can manage all employees" ON employees;
CREATE POLICY "Superadmin can manage all employees"
  ON employees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  );

-- Drop and recreate policies for job_positions with superadmin bypass
DROP POLICY IF EXISTS "Superadmin can view all job positions" ON job_positions;
CREATE POLICY "Superadmin can view all job positions"
  ON job_positions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  );

-- Drop and recreate policies for employee_loans with superadmin bypass
DROP POLICY IF EXISTS "Superadmin can view all loans" ON employee_loans;
CREATE POLICY "Superadmin can view all loans"
  ON employee_loans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  );

-- Drop and recreate policies for salary_payments with superadmin bypass
DROP POLICY IF EXISTS "Superadmin can view all salary payments" ON salary_payments;
CREATE POLICY "Superadmin can view all salary payments"
  ON salary_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "Superadmin can manage all salary payments" ON salary_payments;
CREATE POLICY "Superadmin can manage all salary payments"
  ON salary_payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  );