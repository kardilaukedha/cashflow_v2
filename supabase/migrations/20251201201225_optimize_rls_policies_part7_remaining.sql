/*
  # Optimize RLS Policies - Part 7 (Remaining Tables)
  
  1. Changes
    - Optimize all remaining table policies
    - Use SELECT subqueries for auth functions
*/

-- API Settings
DROP POLICY IF EXISTS "Users can manage own api settings" ON api_settings;
CREATE POLICY "Users can manage own api settings"
  ON api_settings FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Login History
DROP POLICY IF EXISTS "Users can view own login history" ON login_history;
CREATE POLICY "Users can view own login history"
  ON login_history FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Invite Links
DROP POLICY IF EXISTS "Users can view own invite links" ON invite_links;
DROP POLICY IF EXISTS "Users can create invite links" ON invite_links;
DROP POLICY IF EXISTS "Users can update own invite links" ON invite_links;
DROP POLICY IF EXISTS "Users can delete own invite links" ON invite_links;

CREATE POLICY "Users can view own invite links"
  ON invite_links FOR SELECT
  TO authenticated
  USING (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can create invite links"
  ON invite_links FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can update own invite links"
  ON invite_links FOR UPDATE
  TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can delete own invite links"
  ON invite_links FOR DELETE
  TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- Invite Link Usage
DROP POLICY IF EXISTS "Users can view invite usage for their links" ON invite_link_usage;
CREATE POLICY "Users can view invite usage for their links"
  ON invite_link_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invite_links
      WHERE invite_links.id = invite_link_id
      AND invite_links.created_by = (SELECT auth.uid())
    )
  );

-- AI Tips Settings
DROP POLICY IF EXISTS "Users can manage own ai tips settings" ON ai_tips_settings;
CREATE POLICY "Users can manage own ai tips settings"
  ON ai_tips_settings FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Export Logs
DROP POLICY IF EXISTS "Users can view own export logs" ON export_logs;
DROP POLICY IF EXISTS "Users can insert export logs" ON export_logs;

CREATE POLICY "Users can view own export logs"
  ON export_logs FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert export logs"
  ON export_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Company Settings
DROP POLICY IF EXISTS "Users can view own company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can insert own company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can update own company settings" ON company_settings;

CREATE POLICY "Users can manage company settings"
  ON company_settings FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Salary Components
DROP POLICY IF EXISTS "Users can manage own salary components" ON salary_components;
CREATE POLICY "Users can manage own salary components"
  ON salary_components FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Payroll Periods
DROP POLICY IF EXISTS "Users can manage own payroll periods" ON payroll_periods;
CREATE POLICY "Users can manage own payroll periods"
  ON payroll_periods FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Holidays
DROP POLICY IF EXISTS "Users can manage own holidays" ON holidays;
CREATE POLICY "Users can manage own holidays"
  ON holidays FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Notification Settings
DROP POLICY IF EXISTS "Users can manage own notification settings" ON notification_settings;
CREATE POLICY "Users can manage own notification settings"
  ON notification_settings FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Admin Dashboard Preferences
DROP POLICY IF EXISTS "Users can manage own dashboard preferences" ON admin_dashboard_preferences;
CREATE POLICY "Users can manage own dashboard preferences"
  ON admin_dashboard_preferences FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Bulk Operation Logs
DROP POLICY IF EXISTS "Users can manage own bulk logs" ON bulk_operation_logs;
CREATE POLICY "Users can manage own bulk logs"
  ON bulk_operation_logs FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Employee Policies
DROP POLICY IF EXISTS "Users can manage own employee policies" ON employee_policies;
CREATE POLICY "Users can manage own employee policies"
  ON employee_policies FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Budget Plans
DROP POLICY IF EXISTS "Users can manage own budget plans" ON budget_plans;
CREATE POLICY "Users can manage own budget plans"
  ON budget_plans FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Recurring Transactions
DROP POLICY IF EXISTS "Users can manage own recurring transactions" ON recurring_transactions;
CREATE POLICY "Users can manage own recurring transactions"
  ON recurring_transactions FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Cashflow Forecasts
DROP POLICY IF EXISTS "Users can manage own forecasts" ON cashflow_forecasts;
CREATE POLICY "Users can manage own forecasts"
  ON cashflow_forecasts FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Category Hierarchy
DROP POLICY IF EXISTS "Users can manage own category hierarchy" ON category_hierarchy;
CREATE POLICY "Users can manage own category hierarchy"
  ON category_hierarchy FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Transaction Tags
DROP POLICY IF EXISTS "Users can manage own transaction tags" ON transaction_tags;
CREATE POLICY "Users can manage own transaction tags"
  ON transaction_tags FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Report Templates
DROP POLICY IF EXISTS "Users can manage own report templates" ON report_templates;
CREATE POLICY "Users can manage own report templates"
  ON report_templates FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Report Schedules
DROP POLICY IF EXISTS "Users can manage own report schedules" ON report_schedules;
CREATE POLICY "Users can manage own report schedules"
  ON report_schedules FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Batch Salary Payments
DROP POLICY IF EXISTS "Users can manage own batch payments" ON batch_salary_payments;
CREATE POLICY "Users can manage own batch payments"
  ON batch_salary_payments FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Salary Payment Proofs
DROP POLICY IF EXISTS "Users can manage salary payment proofs" ON salary_payment_proofs;
CREATE POLICY "Users can manage salary payment proofs"
  ON salary_payment_proofs FOR ALL
  TO authenticated
  USING (uploaded_by = (SELECT auth.uid()))
  WITH CHECK (uploaded_by = (SELECT auth.uid()));

-- Export Templates
DROP POLICY IF EXISTS "Users can manage own export templates" ON export_templates;
CREATE POLICY "Users can manage own export templates"
  ON export_templates FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Backup Schedules
DROP POLICY IF EXISTS "Users can manage own backup schedules" ON backup_schedules;
CREATE POLICY "Users can manage own backup schedules"
  ON backup_schedules FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Integrations
DROP POLICY IF EXISTS "Users can manage own integrations" ON integrations;
CREATE POLICY "Users can manage own integrations"
  ON integrations FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
