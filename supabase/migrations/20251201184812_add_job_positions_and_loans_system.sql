/*
  # Add Job Positions and Employee Loans System

  1. New Tables
    - `job_positions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text, unique) - Nama jabatan
      - `base_salary` (numeric) - Gaji pokok untuk jabatan
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `employee_loans`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `employee_id` (uuid, references employees)
      - `amount` (numeric) - Jumlah pinjaman
      - `remaining_amount` (numeric) - Sisa pinjaman
      - `monthly_deduction` (numeric) - Potongan per bulan
      - `start_date` (date) - Tanggal mulai pinjaman
      - `status` (text) - active, paid_off
      - `notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Changes
    - Add `job_position_id` to `employees` table
    - Add `loan_deduction` to `salary_payments` table

  3. Security
    - Enable RLS on all new tables
    - Superadmin can do everything
    - Admin keuangan can manage job positions and loans
    - Admin sariroti can view job positions and loans
    - Karyawan can only view their own loans

  4. Important Notes
    - Job positions akan digunakan untuk menentukan gaji pokok
    - Loans akan otomatis dipotong dari gaji bulanan
    - Remaining amount akan di-update otomatis setiap pembayaran gaji
*/

-- Create job_positions table
CREATE TABLE IF NOT EXISTS job_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  base_salary numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE job_positions ENABLE ROW LEVEL SECURITY;

-- Create employee_loans table
CREATE TABLE IF NOT EXISTS employee_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  remaining_amount numeric NOT NULL DEFAULT 0,
  monthly_deduction numeric NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid_off')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE employee_loans ENABLE ROW LEVEL SECURITY;

-- Add job_position_id to employees table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'job_position_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN job_position_id uuid REFERENCES job_positions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add loan_deduction to salary_payments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'salary_payments' AND column_name = 'loan_deduction'
  ) THEN
    ALTER TABLE salary_payments ADD COLUMN loan_deduction numeric DEFAULT 0;
  END IF;
END $$;

-- Update timestamp function for job_positions
CREATE OR REPLACE FUNCTION update_job_positions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_job_positions_updated_at_trigger ON job_positions;
CREATE TRIGGER update_job_positions_updated_at_trigger
  BEFORE UPDATE ON job_positions
  FOR EACH ROW
  EXECUTE FUNCTION update_job_positions_updated_at();

-- Update timestamp function for employee_loans
CREATE OR REPLACE FUNCTION update_employee_loans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_employee_loans_updated_at_trigger ON employee_loans;
CREATE TRIGGER update_employee_loans_updated_at_trigger
  BEFORE UPDATE ON employee_loans
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_loans_updated_at();

-- RLS Policies for job_positions table

CREATE POLICY "Superadmin can do everything with job positions"
  ON job_positions FOR ALL
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

CREATE POLICY "Admin keuangan can manage job positions"
  ON job_positions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin_keuangan')
    ) AND job_positions.user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin_keuangan')
    ) AND job_positions.user_id = auth.uid()
  );

CREATE POLICY "Admin sariroti can view job positions"
  ON job_positions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin_sariroti')
    ) AND job_positions.user_id = auth.uid()
  );

CREATE POLICY "Karyawan can view job positions"
  ON job_positions FOR SELECT
  TO authenticated
  USING (
    job_positions.user_id = auth.uid()
  );

-- RLS Policies for employee_loans table

CREATE POLICY "Superadmin can do everything with loans"
  ON employee_loans FOR ALL
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

CREATE POLICY "Admin keuangan can manage loans"
  ON employee_loans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin_keuangan')
    ) AND employee_loans.user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin_keuangan')
    ) AND employee_loans.user_id = auth.uid()
  );

CREATE POLICY "Admin sariroti can view loans"
  ON employee_loans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin_sariroti')
    ) AND employee_loans.user_id = auth.uid()
  );

CREATE POLICY "Karyawan can view own loans"
  ON employee_loans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.employee_id = employee_loans.employee_id
    )
  );