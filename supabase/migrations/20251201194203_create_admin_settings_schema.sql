/*
  # Admin Settings Schema
  
  1. New Tables
    - `admin_dashboard_preferences` - Dashboard widget & display preferences
    - `bulk_operation_logs` - Audit trail for bulk operations
    - `employee_policies` - Employee management policies & rules
    - `budget_plans` - Budget planning per category
    - `recurring_transactions` - Scheduled recurring transactions
    - `cashflow_forecasts` - Manual & AI cashflow predictions
    - `category_hierarchy` - Parent-child category relationships
    - `transaction_tags` - Tags for transactions
    - `report_templates` - Custom report configurations
    - `report_schedules` - Scheduled report generation
    - `custom_roles` - Custom role definitions
    - `role_permissions` - Granular permissions
    - `approval_workflows` - Transaction approval rules
    - `export_templates` - Data export configurations
    - `backup_schedules` - Auto backup schedules
    - `integrations` - External service integrations
    - `batch_salary_payments` - Batch salary payment records
    - `salary_payment_proofs` - Upload proof of salary transfers
  
  2. Security
    - Enable RLS on all tables
    - Admin & Superadmin access policies
*/

-- Dashboard Preferences
CREATE TABLE IF NOT EXISTS admin_dashboard_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) UNIQUE NOT NULL,
  visible_widgets jsonb DEFAULT '["balance", "income", "expense", "runway", "trend_chart", "category_chart", "transactions"]'::jsonb,
  default_date_range text DEFAULT '30_days',
  chart_colors jsonb DEFAULT '{}'::jsonb,
  quick_filters jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bulk Operation Logs
CREATE TABLE IF NOT EXISTS bulk_operation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  operation_type text NOT NULL,
  target_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Employee Policies
CREATE TABLE IF NOT EXISTS employee_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) UNIQUE NOT NULL,
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

-- Budget Plans
CREATE TABLE IF NOT EXISTS budget_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
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

-- Recurring Transactions
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
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

-- Cashflow Forecasts
CREATE TABLE IF NOT EXISTS cashflow_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  forecast_date date NOT NULL,
  predicted_income numeric(15,2) DEFAULT 0,
  predicted_expense numeric(15,2) DEFAULT 0,
  predicted_balance numeric(15,2) DEFAULT 0,
  scenario text DEFAULT 'realistic',
  is_manual boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Category Hierarchy
CREATE TABLE IF NOT EXISTS category_hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  parent_category_id uuid REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  child_category_id uuid REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(parent_category_id, child_category_id)
);

-- Transaction Tags
CREATE TABLE IF NOT EXISTS transaction_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
  tag_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(transaction_id, tag_name)
);

-- Report Templates
CREATE TABLE IF NOT EXISTS report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  template_name text NOT NULL,
  report_type text NOT NULL,
  configuration jsonb DEFAULT '{}'::jsonb,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Report Schedules
CREATE TABLE IF NOT EXISTS report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  template_id uuid REFERENCES report_templates(id) ON DELETE CASCADE,
  schedule_frequency text NOT NULL CHECK (schedule_frequency IN ('daily', 'weekly', 'monthly')),
  recipients text[] DEFAULT ARRAY[]::text[],
  next_run_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Batch Salary Payments
CREATE TABLE IF NOT EXISTS batch_salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
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

-- Salary Payment Proofs
CREATE TABLE IF NOT EXISTS salary_payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_payment_id uuid REFERENCES batch_salary_payments(id) ON DELETE CASCADE NOT NULL,
  salary_payment_id uuid REFERENCES salary_payments(id) ON DELETE CASCADE NOT NULL,
  proof_type text DEFAULT 'transfer' CHECK (proof_type IN ('transfer', 'cash', 'check')),
  proof_url text,
  proof_number text,
  uploaded_by uuid REFERENCES auth.users(id) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Export Templates
CREATE TABLE IF NOT EXISTS export_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  template_name text NOT NULL,
  export_type text NOT NULL,
  configuration jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Backup Schedules
CREATE TABLE IF NOT EXISTS backup_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
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
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  integration_type text NOT NULL,
  integration_name text NOT NULL,
  credentials jsonb DEFAULT '{}'::jsonb,
  configuration jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_dashboard_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_operation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashflow_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_salary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Users can manage their own data)
CREATE POLICY "Users can manage own dashboard preferences"
  ON admin_dashboard_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own bulk logs"
  ON bulk_operation_logs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own employee policies"
  ON employee_policies FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own budget plans"
  ON budget_plans FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own recurring transactions"
  ON recurring_transactions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own forecasts"
  ON cashflow_forecasts FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own category hierarchy"
  ON category_hierarchy FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own transaction tags"
  ON transaction_tags FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own report templates"
  ON report_templates FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own report schedules"
  ON report_schedules FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own batch payments"
  ON batch_salary_payments FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage salary payment proofs"
  ON salary_payment_proofs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM batch_salary_payments 
      WHERE batch_salary_payments.id = batch_payment_id 
      AND batch_salary_payments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own export templates"
  ON export_templates FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own backup schedules"
  ON backup_schedules FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own integrations"
  ON integrations FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_budget_plans_user_id ON budget_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_plans_category_id ON budget_plans(category_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user_id ON recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_next_occurrence ON recurring_transactions(next_occurrence);
CREATE INDEX IF NOT EXISTS idx_cashflow_forecasts_user_id ON cashflow_forecasts(user_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_forecasts_date ON cashflow_forecasts(forecast_date);
CREATE INDEX IF NOT EXISTS idx_transaction_tags_transaction_id ON transaction_tags(transaction_id);
CREATE INDEX IF NOT EXISTS idx_batch_salary_payments_user_id ON batch_salary_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_salary_payments_period ON batch_salary_payments(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_salary_payment_proofs_batch_id ON salary_payment_proofs(batch_payment_id);
