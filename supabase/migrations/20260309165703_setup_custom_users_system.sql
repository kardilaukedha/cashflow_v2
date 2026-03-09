/*
  # Setup Custom Users System
  
  1. Changes
    - Create public.users table for custom auth
    - Drop FK from user_profiles to auth.users
    - Add email and extra columns to user_profiles
    - Insert default admin user (admin@admin.com / password)
    - Create all required app tables
    
  2. Notes
    - The app uses Express server with custom JWT auth
    - Password is bcrypt hashed
    - user_profiles.user_id will reference public.users instead of auth.users
*/

-- Step 1: Create custom users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Step 2: Drop old FK from user_profiles to auth.users
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

-- Step 3: Remove the old user_profile that references auth.users
DELETE FROM user_profiles WHERE user_id NOT IN (SELECT id FROM users) AND user_id NOT IN (SELECT id FROM auth.users WHERE email = 'admin@admin.com');

-- Step 4: Add missing columns to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'email') THEN
    ALTER TABLE user_profiles ADD COLUMN email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'phone') THEN
    ALTER TABLE user_profiles ADD COLUMN phone text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'department') THEN
    ALTER TABLE user_profiles ADD COLUMN department text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'job_title') THEN
    ALTER TABLE user_profiles ADD COLUMN job_title text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'hire_date') THEN
    ALTER TABLE user_profiles ADD COLUMN hire_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'nik') THEN
    ALTER TABLE user_profiles ADD COLUMN nik text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'gender') THEN
    ALTER TABLE user_profiles ADD COLUMN gender text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'date_of_birth') THEN
    ALTER TABLE user_profiles ADD COLUMN date_of_birth date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'address') THEN
    ALTER TABLE user_profiles ADD COLUMN address text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'status') THEN
    ALTER TABLE user_profiles ADD COLUMN status text DEFAULT 'active';
  END IF;
END $$;

-- Step 5: Insert default admin user with bcrypt hash for 'password'
INSERT INTO users (email, password_hash)
VALUES ('admin@admin.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')
ON CONFLICT (email) DO NOTHING;

-- Step 6: Clear old user_profiles and create fresh superadmin profile
DELETE FROM user_profiles;

INSERT INTO user_profiles (user_id, role, full_name, email)
SELECT id, 'superadmin', 'Super Admin', 'admin@admin.com'
FROM users WHERE email = 'admin@admin.com';

-- Step 7: Create all remaining app tables
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  color text NOT NULL DEFAULT '#6366f1',
  icon text NOT NULL DEFAULT 'Circle',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_category UNIQUE (user_id, name, type)
);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  category_id uuid,
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  amount numeric(15, 2) NOT NULL CHECK (amount > 0),
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

CREATE TABLE IF NOT EXISTS positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  base_salary numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  position_id uuid,
  job_position_id uuid,
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

CREATE TABLE IF NOT EXISTS employee_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  remaining_amount numeric NOT NULL DEFAULT 0,
  monthly_deduction numeric NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid_off')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  payment_date date DEFAULT CURRENT_DATE NOT NULL,
  period_month integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year integer NOT NULL CHECK (period_year >= 2000),
  basic_salary numeric(15,2) DEFAULT 0 NOT NULL,
  transport_allowance numeric(15,2) DEFAULT 0 NOT NULL,
  communication_allowance numeric(15,2) DEFAULT 0 NOT NULL,
  motorcycle_rental numeric(15,2) DEFAULT 0 NOT NULL,
  meal_allowance numeric(15,2) DEFAULT 0 NOT NULL,
  bonus numeric(15,2) DEFAULT 0 NOT NULL,
  loan_deduction numeric DEFAULT 0,
  total_salary numeric(15,2) DEFAULT 0 NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ip_address text,
  device_info text,
  status text DEFAULT 'success',
  logged_in_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  invite_token text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('superadmin', 'admin_keuangan', 'admin_sariroti', 'karyawan', 'karyawan_sariroti')),
  max_uses integer DEFAULT 1 NOT NULL CHECK (max_uses > 0),
  current_uses integer DEFAULT 0 NOT NULL,
  expires_at timestamptz,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invite_link_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_link_id uuid NOT NULL,
  used_by uuid NOT NULL,
  used_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text NOT NULL,
  logo_url text,
  address text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  npwp text,
  currency text DEFAULT 'IDR',
  fiscal_year_start integer DEFAULT 1,
  timezone text DEFAULT 'Asia/Jakarta',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  runway_alert_enabled boolean DEFAULT true,
  runway_threshold_days integer DEFAULT 30,
  large_transaction_alert boolean DEFAULT true,
  large_transaction_threshold numeric DEFAULT 5000000,
  salary_payment_reminder boolean DEFAULT true,
  loan_due_reminder boolean DEFAULT true,
  attendance_cutoff_reminder boolean DEFAULT true,
  weekly_summary_email boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  api_key text NOT NULL,
  is_active boolean DEFAULT false,
  last_tested_at timestamptz,
  test_status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_tips_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  is_enabled boolean DEFAULT false,
  language text DEFAULT 'id',
  tone text DEFAULT 'friendly',
  preferred_categories text[] DEFAULT ARRAY[]::text[],
  frequency text DEFAULT 'weekly',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS export_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  export_type text NOT NULL,
  file_format text NOT NULL,
  date_range_start date,
  date_range_end date,
  exported_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budget_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid,
  budget_period text DEFAULT 'monthly',
  amount numeric(15,2) NOT NULL,
  start_date date NOT NULL,
  end_date date,
  alert_threshold_percentage integer DEFAULT 80,
  rollover_enabled boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recurring_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid NOT NULL,
  description text NOT NULL,
  amount numeric(15,2) NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  start_date date NOT NULL,
  end_date date,
  next_occurrence date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cashflow_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  forecast_date date NOT NULL,
  predicted_income numeric(15,2) DEFAULT 0,
  predicted_expense numeric(15,2) DEFAULT 0,
  predicted_balance numeric(15,2) DEFAULT 0,
  scenario text DEFAULT 'realistic',
  is_manual boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS batch_salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  batch_name text NOT NULL,
  period_month integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year integer NOT NULL CHECK (period_year >= 2000),
  total_employees integer DEFAULT 0,
  total_amount numeric(15,2) DEFAULT 0,
  payment_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS salary_payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_payment_id uuid NOT NULL,
  salary_payment_id uuid NOT NULL,
  proof_type text DEFAULT 'transfer' CHECK (proof_type IN ('transfer', 'cash', 'check')),
  proof_url text,
  proof_number text,
  uploaded_by uuid NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_name text NOT NULL,
  report_type text NOT NULL,
  configuration jsonb DEFAULT '{}'::jsonb,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id uuid,
  schedule_frequency text NOT NULL CHECK (schedule_frequency IN ('daily', 'weekly', 'monthly')),
  recipients text[] DEFAULT ARRAY[]::text[],
  next_run_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  auto_salary_increment_enabled boolean DEFAULT false,
  auto_salary_increment_percentage numeric(5,2) DEFAULT 0,
  auto_salary_increment_months integer DEFAULT 12,
  prorate_salary_enabled boolean DEFAULT true,
  thr_calculation_formula text DEFAULT 'one_month_salary',
  max_loan_percentage numeric(5,2) DEFAULT 50,
  max_loan_tenure_months integer DEFAULT 12,
  loan_interest_rate numeric(5,2) DEFAULT 0,
  allow_multiple_loans boolean DEFAULT false,
  late_deduction_amount numeric(15,2) DEFAULT 0,
  overtime_multiplier numeric(5,2) DEFAULT 1.5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_dashboard_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  visible_widgets jsonb DEFAULT '["balance", "income", "expense", "runway", "trend_chart", "category_chart", "transactions"]'::jsonb,
  default_date_range text DEFAULT '30_days',
  chart_colors jsonb DEFAULT '{}'::jsonb,
  quick_filters jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bulk_operation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  operation_type text NOT NULL,
  target_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS salary_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'deduction')),
  is_taxable boolean DEFAULT false,
  calculation_type text DEFAULT 'fixed' CHECK (calculation_type IN ('fixed', 'percentage')),
  formula text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  attendance_start_day integer DEFAULT 21,
  attendance_end_day integer DEFAULT 20,
  payment_day integer DEFAULT 25,
  working_hours_per_day numeric DEFAULT 8,
  overtime_multiplier numeric DEFAULT 1.5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  name text NOT NULL,
  is_national boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS category_hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  parent_category_id uuid NOT NULL,
  child_category_id uuid NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(parent_category_id, child_category_id)
);

CREATE TABLE IF NOT EXISTS transaction_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  transaction_id uuid NOT NULL,
  tag_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(transaction_id, tag_name)
);

CREATE TABLE IF NOT EXISTS export_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_name text NOT NULL,
  export_type text NOT NULL,
  configuration jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS backup_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  schedule_frequency text NOT NULL CHECK (schedule_frequency IN ('daily', 'weekly', 'monthly')),
  backup_scope text[] DEFAULT ARRAY['all']::text[],
  storage_location text DEFAULT 'email',
  next_backup_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  integration_type text NOT NULL,
  integration_name text NOT NULL,
  credentials jsonb DEFAULT '{}'::jsonb,
  configuration jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  target_roles text[] DEFAULT '{karyawan,karyawan_sariroti}',
  priority text DEFAULT 'normal',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id uuid,
  nama_toko text NOT NULL,
  nama_pemilik text DEFAULT '',
  alamat text DEFAULT '',
  nomor_hp text DEFAULT '',
  sharelok text DEFAULT '',
  foto_toko text DEFAULT '',
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visit_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_date date NOT NULL,
  stores jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at timestamptz,
  approved_at timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visit_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_plan_id uuid NOT NULL,
  user_id uuid NOT NULL,
  store_name text NOT NULL,
  store_address text DEFAULT '',
  checkin_time timestamptz DEFAULT now(),
  checkout_time timestamptz,
  duration_minutes integer,
  selfie_url text DEFAULT '',
  visit_type text DEFAULT 'regular',
  total_billing numeric DEFAULT 0,
  has_expired_bread boolean DEFAULT false,
  notes text DEFAULT '',
  status text DEFAULT 'completed',
  gps_lat decimal(10,8),
  gps_lng decimal(11,8),
  gps_accuracy decimal,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bread_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id uuid NOT NULL,
  user_id uuid NOT NULL,
  sku_code text NOT NULL,
  sku_name text DEFAULT '',
  quantity integer DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sariroti_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id uuid NOT NULL UNIQUE,
  min_visits integer DEFAULT 5,
  max_visits integer DEFAULT 10,
  plan_deadline time DEFAULT '09:00:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sku_items (
  id SERIAL PRIMARY KEY,
  kode VARCHAR(50) NOT NULL UNIQUE,
  nama VARCHAR(255) NOT NULL,
  kategori VARCHAR(100) NOT NULL,
  cbp INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);