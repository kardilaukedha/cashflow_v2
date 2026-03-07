-- Custom users table (replaces Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- User profiles with role management
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role text DEFAULT 'karyawan' NOT NULL CHECK (role IN ('superadmin', 'admin_keuangan', 'admin_sariroti', 'karyawan', 'karyawan_sariroti')),
  full_name text NOT NULL DEFAULT '',
  email text,
  phone text DEFAULT '',
  department text DEFAULT '',
  job_title text DEFAULT '',
  hire_date date,
  nik text DEFAULT '',
  gender text DEFAULT '',
  date_of_birth date,
  address text DEFAULT '',
  status text DEFAULT 'active',
  employee_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Categories for cashflow
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  color text NOT NULL DEFAULT '#6366f1',
  icon text NOT NULL DEFAULT 'Circle',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_category UNIQUE (user_id, name, type)
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE RESTRICT NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  amount numeric(15, 2) NOT NULL CHECK (amount > 0),
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- Positions (jabatan)
CREATE TABLE IF NOT EXISTS positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);

-- Job positions
CREATE TABLE IF NOT EXISTS job_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  base_salary numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_job_positions_user_id ON job_positions(user_id);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  position_id uuid REFERENCES positions(id) ON DELETE SET NULL,
  job_position_id uuid REFERENCES job_positions(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_position_id ON employees(position_id);
CREATE INDEX IF NOT EXISTS idx_employees_job_position_id ON employees(job_position_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);

-- Add employee_id foreign key to user_profiles after employees table exists
ALTER TABLE user_profiles ADD CONSTRAINT fk_user_profiles_employee_id
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
  NOT VALID;

-- Employee loans
CREATE TABLE IF NOT EXISTS employee_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  remaining_amount numeric NOT NULL DEFAULT 0,
  monthly_deduction numeric NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid_off')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_loans_user_id ON employee_loans(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_loans_employee_id ON employee_loans(employee_id);

-- Salary payments
CREATE TABLE IF NOT EXISTS salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_salary_payments_user_id ON salary_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_employee_id ON salary_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_period ON salary_payments(period_year, period_month);

-- Login history
CREATE TABLE IF NOT EXISTS login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  ip_address text,
  device_info text,
  status text DEFAULT 'success',
  logged_in_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);

-- Invite links
CREATE TABLE IF NOT EXISTS invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  invite_token text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('superadmin', 'admin_keuangan', 'admin_sariroti', 'karyawan', 'karyawan_sariroti')),
  max_uses integer DEFAULT 1 NOT NULL CHECK (max_uses > 0),
  current_uses integer DEFAULT 0 NOT NULL,
  expires_at timestamptz,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invite_links_token ON invite_links(invite_token);
CREATE INDEX IF NOT EXISTS idx_invite_links_created_by ON invite_links(created_by);
CREATE INDEX IF NOT EXISTS idx_invite_links_active ON invite_links(is_active);

-- Invite link usage
CREATE TABLE IF NOT EXISTS invite_link_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_link_id uuid REFERENCES invite_links(id) ON DELETE CASCADE NOT NULL,
  used_by uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  used_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invite_link_usage_invite_id ON invite_link_usage(invite_link_id);
CREATE INDEX IF NOT EXISTS idx_invite_link_usage_used_by ON invite_link_usage(used_by);

-- Company settings
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_company_settings_user_id ON company_settings(user_id);

-- Notification settings
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) UNIQUE NOT NULL,
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

-- API settings
CREATE TABLE IF NOT EXISTS api_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  provider text NOT NULL,
  api_key text NOT NULL,
  is_active boolean DEFAULT false,
  last_tested_at timestamptz,
  test_status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_settings_user_id ON api_settings(user_id);

-- AI tips settings
CREATE TABLE IF NOT EXISTS ai_tips_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) UNIQUE NOT NULL,
  is_enabled boolean DEFAULT false,
  language text DEFAULT 'id',
  tone text DEFAULT 'friendly',
  preferred_categories text[] DEFAULT ARRAY[]::text[],
  frequency text DEFAULT 'weekly',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Export logs
CREATE TABLE IF NOT EXISTS export_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  export_type text NOT NULL,
  file_format text NOT NULL,
  date_range_start date,
  date_range_end date,
  exported_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_export_logs_user_id ON export_logs(user_id);

-- Budget plans
CREATE TABLE IF NOT EXISTS budget_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_budget_plans_user_id ON budget_plans(user_id);

-- Recurring transactions
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  category_id uuid REFERENCES categories(id) NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user_id ON recurring_transactions(user_id);

-- Cashflow forecasts
CREATE TABLE IF NOT EXISTS cashflow_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  forecast_date date NOT NULL,
  predicted_income numeric(15,2) DEFAULT 0,
  predicted_expense numeric(15,2) DEFAULT 0,
  predicted_balance numeric(15,2) DEFAULT 0,
  scenario text DEFAULT 'realistic',
  is_manual boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cashflow_forecasts_user_id ON cashflow_forecasts(user_id);

-- Batch salary payments
CREATE TABLE IF NOT EXISTS batch_salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_batch_salary_payments_user_id ON batch_salary_payments(user_id);

-- Salary payment proofs
CREATE TABLE IF NOT EXISTS salary_payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_payment_id uuid REFERENCES batch_salary_payments(id) ON DELETE CASCADE NOT NULL,
  salary_payment_id uuid REFERENCES salary_payments(id) ON DELETE CASCADE NOT NULL,
  proof_type text DEFAULT 'transfer' CHECK (proof_type IN ('transfer', 'cash', 'check')),
  proof_url text,
  proof_number text,
  uploaded_by uuid REFERENCES users(id) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Report templates
CREATE TABLE IF NOT EXISTS report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  template_name text NOT NULL,
  report_type text NOT NULL,
  configuration jsonb DEFAULT '{}'::jsonb,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Report schedules
CREATE TABLE IF NOT EXISTS report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  template_id uuid REFERENCES report_templates(id) ON DELETE CASCADE,
  schedule_frequency text NOT NULL CHECK (schedule_frequency IN ('daily', 'weekly', 'monthly')),
  recipients text[] DEFAULT ARRAY[]::text[],
  next_run_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Employee policies
CREATE TABLE IF NOT EXISTS employee_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) UNIQUE NOT NULL,
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

-- Admin dashboard preferences
CREATE TABLE IF NOT EXISTS admin_dashboard_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) UNIQUE NOT NULL,
  visible_widgets jsonb DEFAULT '["balance", "income", "expense", "runway", "trend_chart", "category_chart", "transactions"]'::jsonb,
  default_date_range text DEFAULT '30_days',
  chart_colors jsonb DEFAULT '{}'::jsonb,
  quick_filters jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bulk operation logs
CREATE TABLE IF NOT EXISTS bulk_operation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  operation_type text NOT NULL,
  target_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Salary components
CREATE TABLE IF NOT EXISTS salary_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'deduction')),
  is_taxable boolean DEFAULT false,
  calculation_type text DEFAULT 'fixed' CHECK (calculation_type IN ('fixed', 'percentage')),
  formula text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Payroll periods
CREATE TABLE IF NOT EXISTS payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  attendance_start_day integer DEFAULT 21,
  attendance_end_day integer DEFAULT 20,
  payment_day integer DEFAULT 25,
  working_hours_per_day numeric DEFAULT 8,
  overtime_multiplier numeric DEFAULT 1.5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Holidays
CREATE TABLE IF NOT EXISTS holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  date date NOT NULL,
  name text NOT NULL,
  is_national boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Category hierarchy
CREATE TABLE IF NOT EXISTS category_hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  parent_category_id uuid REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  child_category_id uuid REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(parent_category_id, child_category_id)
);

-- Transaction tags
CREATE TABLE IF NOT EXISTS transaction_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
  tag_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(transaction_id, tag_name)
);

-- Export templates
CREATE TABLE IF NOT EXISTS export_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  template_name text NOT NULL,
  export_type text NOT NULL,
  configuration jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Backup schedules
CREATE TABLE IF NOT EXISTS backup_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  schedule_frequency text NOT NULL CHECK (schedule_frequency IN ('daily', 'weekly', 'monthly')),
  backup_scope text[] DEFAULT ARRAY['all']::text[],
  storage_location text DEFAULT 'email',
  next_backup_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Integrations
CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  integration_type text NOT NULL,
  integration_name text NOT NULL,
  credentials jsonb DEFAULT '{}'::jsonb,
  configuration jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  target_roles text[] DEFAULT '{karyawan,karyawan_sariroti}',
  priority text DEFAULT 'normal',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_user_id ON announcements(user_id);

-- Stores (Sariroti field sales)
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_stores_user_profile_id ON stores(user_profile_id);

-- Visit plans
CREATE TABLE IF NOT EXISTS visit_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  plan_date date NOT NULL,
  stores jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at timestamptz,
  approved_at timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visit_plans_user_id ON visit_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_visit_plans_plan_date ON visit_plans(plan_date);

-- Visit check-ins
CREATE TABLE IF NOT EXISTS visit_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_plan_id uuid REFERENCES visit_plans(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_visit_checkins_visit_plan_id ON visit_checkins(visit_plan_id);
CREATE INDEX IF NOT EXISTS idx_visit_checkins_user_id ON visit_checkins(user_id);

-- Bread scans (for visit check-ins)
CREATE TABLE IF NOT EXISTS bread_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id uuid REFERENCES visit_checkins(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  sku_code text NOT NULL,
  sku_name text DEFAULT '',
  quantity integer DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bread_scans_checkin_id ON bread_scans(checkin_id);

-- Sariroti settings per karyawan
CREATE TABLE IF NOT EXISTS sariroti_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  min_visits integer DEFAULT 5,
  max_visits integer DEFAULT 10,
  plan_deadline time DEFAULT '09:00:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default superadmin user (admin@admin.com / admin123)
-- Password hash for 'admin123'
INSERT INTO users (email, password_hash)
VALUES ('admin@admin.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')
ON CONFLICT (email) DO NOTHING;

-- Create superadmin profile
INSERT INTO user_profiles (user_id, role, full_name, email)
SELECT id, 'superadmin', 'Super Admin', 'admin@admin.com'
FROM users WHERE email = 'admin@admin.com'
ON CONFLICT (user_id) DO NOTHING;
