/*
  # Employee Salary Management Schema

  ## New Tables
  
  ### 1. `positions` - Jabatan Karyawan
    - `id` (uuid, primary key)
    - `user_id` (uuid, references auth.users)
    - `name` (text) - Nama jabatan
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 2. `employees` - Data Karyawan
    - `id` (uuid, primary key)
    - `user_id` (uuid, references auth.users)
    - `position_id` (uuid, references positions)
    - `name` (text) - Nama karyawan
    - `employee_code` (text) - Kode karyawan
    - `basic_salary` (numeric) - Gaji pokok
    - `transport_allowance` (numeric) - Tunjangan transport
    - `communication_allowance` (numeric) - Tunjangan komunikasi
    - `motorcycle_rental` (numeric) - Sewa motor
    - `meal_allowance` (numeric) - Konsumsi/makan
    - `status` (text) - Status: active, inactive
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 3. `salary_payments` - History Pembayaran Gaji
    - `id` (uuid, primary key)
    - `user_id` (uuid, references auth.users)
    - `employee_id` (uuid, references employees)
    - `payment_date` (date) - Tanggal pembayaran
    - `period_month` (integer) - Bulan periode
    - `period_year` (integer) - Tahun periode
    - `basic_salary` (numeric)
    - `transport_allowance` (numeric)
    - `communication_allowance` (numeric)
    - `motorcycle_rental` (numeric)
    - `meal_allowance` (numeric)
    - `total_salary` (numeric) - Total gaji
    - `notes` (text) - Catatan
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create positions table
CREATE TABLE IF NOT EXISTS positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  position_id uuid REFERENCES positions(id) ON DELETE SET NULL,
  name text NOT NULL,
  employee_code text NOT NULL,
  basic_salary numeric(15,2) DEFAULT 0 NOT NULL,
  transport_allowance numeric(15,2) DEFAULT 0 NOT NULL,
  communication_allowance numeric(15,2) DEFAULT 0 NOT NULL,
  motorcycle_rental numeric(15,2) DEFAULT 0 NOT NULL,
  meal_allowance numeric(15,2) DEFAULT 0 NOT NULL,
  status text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, employee_code)
);

-- Create salary_payments table
CREATE TABLE IF NOT EXISTS salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  payment_date date DEFAULT CURRENT_DATE NOT NULL,
  period_month integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year integer NOT NULL CHECK (period_year >= 2000),
  basic_salary numeric(15,2) DEFAULT 0 NOT NULL,
  transport_allowance numeric(15,2) DEFAULT 0 NOT NULL,
  communication_allowance numeric(15,2) DEFAULT 0 NOT NULL,
  motorcycle_rental numeric(15,2) DEFAULT 0 NOT NULL,
  meal_allowance numeric(15,2) DEFAULT 0 NOT NULL,
  total_salary numeric(15,2) DEFAULT 0 NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_position_id ON employees(position_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_salary_payments_user_id ON salary_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_employee_id ON salary_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_period ON salary_payments(period_year, period_month);

-- Enable RLS
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for positions
CREATE POLICY "Users can view own positions"
  ON positions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own positions"
  ON positions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own positions"
  ON positions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own positions"
  ON positions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for employees
CREATE POLICY "Users can view own employees"
  ON employees FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own employees"
  ON employees FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for salary_payments
CREATE POLICY "Users can view own salary payments"
  ON salary_payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own salary payments"
  ON salary_payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own salary payments"
  ON salary_payments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own salary payments"
  ON salary_payments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Triggers to auto-update updated_at
CREATE TRIGGER update_positions_updated_at
  BEFORE UPDATE ON positions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_salary_payments_updated_at
  BEFORE UPDATE ON salary_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create default positions for new users
CREATE OR REPLACE FUNCTION public.create_default_positions()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.positions (user_id, name) VALUES
    (NEW.id, 'Direktur'),
    (NEW.id, 'Manager'),
    (NEW.id, 'Supervisor'),
    (NEW.id, 'Staff'),
    (NEW.id, 'Admin'),
    (NEW.id, 'Karyawan');
  
  RETURN NEW;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_default_positions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_positions() TO service_role;

-- Create trigger to auto-create default positions
CREATE TRIGGER on_auth_user_created_positions
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_positions();
