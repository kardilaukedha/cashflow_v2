/*
  # Create Settings Schema
  
  1. New Tables
    - `company_settings` - Store company profile information
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users) - owner
      - `company_name` (text)
      - `logo_url` (text, nullable)
      - `address` (text)
      - `phone` (text)
      - `email` (text)
      - `npwp` (text, nullable)
      - `currency` (text, default 'IDR')
      - `fiscal_year_start` (integer, 1-12)
      - `timezone` (text, default 'Asia/Jakarta')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `salary_components` - Master data for salary components
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `name` (text)
      - `type` (text: 'income' or 'deduction')
      - `is_taxable` (boolean, default false)
      - `calculation_type` (text: 'fixed' or 'percentage')
      - `formula` (text, nullable) - for percentage or complex calculation
      - `is_active` (boolean, default true)
      - `display_order` (integer, default 0)
      - `created_at` (timestamp)
    
    - `payroll_periods` - Payroll period configuration
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `attendance_start_day` (integer, 1-31)
      - `attendance_end_day` (integer, 1-31)
      - `payment_day` (integer, 1-31)
      - `working_hours_per_day` (numeric, default 8)
      - `overtime_multiplier` (numeric, default 1.5)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `holidays` - National and company holidays
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `date` (date)
      - `name` (text)
      - `is_national` (boolean, default true)
      - `created_at` (timestamp)
    
    - `notification_settings` - User notification preferences
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key, unique)
      - `runway_alert_enabled` (boolean, default true)
      - `runway_threshold_days` (integer, default 30)
      - `large_transaction_alert` (boolean, default true)
      - `large_transaction_threshold` (numeric, default 5000000)
      - `salary_payment_reminder` (boolean, default true)
      - `loan_due_reminder` (boolean, default true)
      - `attendance_cutoff_reminder` (boolean, default true)
      - `weekly_summary_email` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `api_settings` - API integration settings
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `provider` (text) - 'gemini', 'openai', 'telegram', etc
      - `api_key` (text) - should be encrypted
      - `is_active` (boolean, default false)
      - `last_tested_at` (timestamp, nullable)
      - `test_status` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `ai_tips_settings` - AI tips preferences
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key, unique)
      - `is_enabled` (boolean, default false)
      - `language` (text, default 'id')
      - `tone` (text, default 'friendly')
      - `preferred_categories` (text array)
      - `frequency` (text, default 'weekly')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `export_logs` - Track export activities
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `export_type` (text)
      - `file_format` (text)
      - `date_range_start` (date, nullable)
      - `date_range_end` (date, nullable)
      - `exported_at` (timestamp)
    
    - `login_history` - Security audit log
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `ip_address` (text)
      - `device_info` (text, nullable)
      - `status` (text) - 'success' or 'failed'
      - `logged_in_at` (timestamp)
  
  2. Security
    - Enable RLS on all tables
    - Users can only access their own settings
    - Superadmin can access all settings
*/

-- Company Settings
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
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

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company settings"
  ON company_settings FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.user_id = auth.uid() AND user_profiles.role = 'superadmin')
  );

CREATE POLICY "Users can insert own company settings"
  ON company_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own company settings"
  ON company_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Salary Components
CREATE TABLE IF NOT EXISTS salary_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'deduction')),
  is_taxable boolean DEFAULT false,
  calculation_type text DEFAULT 'fixed' CHECK (calculation_type IN ('fixed', 'percentage')),
  formula text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE salary_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own salary components"
  ON salary_components FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.user_id = auth.uid() AND user_profiles.role = 'superadmin')
  )
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.user_id = auth.uid() AND user_profiles.role = 'superadmin')
  );

-- Payroll Periods
CREATE TABLE IF NOT EXISTS payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  attendance_start_day integer DEFAULT 21,
  attendance_end_day integer DEFAULT 20,
  payment_day integer DEFAULT 25,
  working_hours_per_day numeric DEFAULT 8,
  overtime_multiplier numeric DEFAULT 1.5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own payroll periods"
  ON payroll_periods FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Holidays
CREATE TABLE IF NOT EXISTS holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  date date NOT NULL,
  name text NOT NULL,
  is_national boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own holidays"
  ON holidays FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Notification Settings
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) UNIQUE NOT NULL,
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

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notification settings"
  ON notification_settings FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- API Settings
CREATE TABLE IF NOT EXISTS api_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  provider text NOT NULL,
  api_key text NOT NULL,
  is_active boolean DEFAULT false,
  last_tested_at timestamptz,
  test_status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE api_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own api settings"
  ON api_settings FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- AI Tips Settings
CREATE TABLE IF NOT EXISTS ai_tips_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) UNIQUE NOT NULL,
  is_enabled boolean DEFAULT false,
  language text DEFAULT 'id',
  tone text DEFAULT 'friendly',
  preferred_categories text[] DEFAULT ARRAY[]::text[],
  frequency text DEFAULT 'weekly',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_tips_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ai tips settings"
  ON ai_tips_settings FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Export Logs
CREATE TABLE IF NOT EXISTS export_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  export_type text NOT NULL,
  file_format text NOT NULL,
  date_range_start date,
  date_range_end date,
  exported_at timestamptz DEFAULT now()
);

ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own export logs"
  ON export_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert export logs"
  ON export_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Login History
CREATE TABLE IF NOT EXISTS login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  ip_address text,
  device_info text,
  status text DEFAULT 'success',
  logged_in_at timestamptz DEFAULT now()
);

ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own login history"
  ON login_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_settings_user_id ON company_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_salary_components_user_id ON salary_components(user_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_user_id ON payroll_periods(user_id);
CREATE INDEX IF NOT EXISTS idx_holidays_user_id ON holidays(user_id);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_api_settings_user_id ON api_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_tips_settings_user_id ON ai_tips_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_user_id ON export_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
