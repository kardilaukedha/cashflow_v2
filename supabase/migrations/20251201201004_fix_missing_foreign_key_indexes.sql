/*
  # Fix Missing Foreign Key Indexes

  1. Performance Improvements
    - Add indexes for all foreign keys that are missing covering indexes
    - This will significantly improve query performance for joins and lookups

  2. New Indexes
    - backup_schedules: user_id
    - bulk_operation_logs: user_id
    - category_hierarchy: child_category_id, user_id
    - employee_loans: employee_id, user_id
    - employees: job_position_id
    - export_templates: user_id
    - integrations: user_id
    - recurring_transactions: category_id
    - report_schedules: template_id, user_id
    - report_templates: user_id
    - salary_payment_proofs: salary_payment_id, uploaded_by
    - transaction_tags: user_id
    - user_profiles: employee_id
*/

-- Create indexes for foreign keys

-- backup_schedules
CREATE INDEX IF NOT EXISTS idx_backup_schedules_user_id ON backup_schedules(user_id);

-- bulk_operation_logs
CREATE INDEX IF NOT EXISTS idx_bulk_operation_logs_user_id ON bulk_operation_logs(user_id);

-- category_hierarchy
CREATE INDEX IF NOT EXISTS idx_category_hierarchy_child_category_id ON category_hierarchy(child_category_id);
CREATE INDEX IF NOT EXISTS idx_category_hierarchy_user_id ON category_hierarchy(user_id);

-- employee_loans
CREATE INDEX IF NOT EXISTS idx_employee_loans_employee_id ON employee_loans(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_loans_user_id ON employee_loans(user_id);

-- employees
CREATE INDEX IF NOT EXISTS idx_employees_job_position_id ON employees(job_position_id);

-- export_templates
CREATE INDEX IF NOT EXISTS idx_export_templates_user_id ON export_templates(user_id);

-- integrations
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);

-- recurring_transactions
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_category_id ON recurring_transactions(category_id);

-- report_schedules
CREATE INDEX IF NOT EXISTS idx_report_schedules_template_id ON report_schedules(template_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_user_id ON report_schedules(user_id);

-- report_templates
CREATE INDEX IF NOT EXISTS idx_report_templates_user_id ON report_templates(user_id);

-- salary_payment_proofs
CREATE INDEX IF NOT EXISTS idx_salary_payment_proofs_salary_payment_id ON salary_payment_proofs(salary_payment_id);
CREATE INDEX IF NOT EXISTS idx_salary_payment_proofs_uploaded_by ON salary_payment_proofs(uploaded_by);

-- transaction_tags
CREATE INDEX IF NOT EXISTS idx_transaction_tags_user_id ON transaction_tags(user_id);

-- user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_employee_id ON user_profiles(employee_id);

-- invite_links (already has indexes but ensure created_by is indexed)
CREATE INDEX IF NOT EXISTS idx_invite_links_created_by ON invite_links(created_by);
