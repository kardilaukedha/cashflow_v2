/*
  # Insert Sample Employee Data

  1. Sample Data
    - 4 Job Positions (Staff, Supervisor, Manager, General Manager)
    - 10 Sample Employees with different positions
    - 5 Sample Employee Loans (active and paid_off status)
    - Sample Salary Payments for the last 3 months

  2. Purpose
    - Mempermudah testing fitur-fitur baru
    - Demonstrasi perhitungan gaji dengan pinjaman
    - Contoh data untuk setiap jabatan

  3. Notes
    - Data menggunakan user_id dari user pertama yang ada
    - Pinjaman dengan berbagai status untuk testing
    - Salary payments mencakup bonus dan potongan pinjaman
*/

-- Get the first user_id
DO $$
DECLARE
  v_user_id uuid;
  v_position_staff uuid;
  v_position_supervisor uuid;
  v_position_manager uuid;
  v_position_gm uuid;
  v_emp1_id uuid;
  v_emp2_id uuid;
  v_emp3_id uuid;
  v_emp4_id uuid;
  v_emp5_id uuid;
  v_emp6_id uuid;
  v_emp7_id uuid;
  v_emp8_id uuid;
  v_emp9_id uuid;
  v_emp10_id uuid;
BEGIN
  -- Get first user
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  
  -- Insert Job Positions
  INSERT INTO job_positions (user_id, name, base_salary)
  VALUES
    (v_user_id, 'Staff', 5000000),
    (v_user_id, 'Supervisor', 8000000),
    (v_user_id, 'Manager', 12000000),
    (v_user_id, 'General Manager', 18000000)
  ON CONFLICT (user_id, name) DO UPDATE
    SET base_salary = EXCLUDED.base_salary;

  -- Get position IDs
  SELECT id INTO v_position_staff FROM job_positions WHERE user_id = v_user_id AND name = 'Staff' LIMIT 1;
  SELECT id INTO v_position_supervisor FROM job_positions WHERE user_id = v_user_id AND name = 'Supervisor' LIMIT 1;
  SELECT id INTO v_position_manager FROM job_positions WHERE user_id = v_user_id AND name = 'Manager' LIMIT 1;
  SELECT id INTO v_position_gm FROM job_positions WHERE user_id = v_user_id AND name = 'General Manager' LIMIT 1;

  -- Insert Sample Employees
  INSERT INTO employees (user_id, name, employee_code, job_position_id, basic_salary, transport_allowance, communication_allowance, motorcycle_rental, meal_allowance, status)
  VALUES
    (v_user_id, 'Budi Santoso', 'EMP001', v_position_staff, 5000000, 500000, 300000, 0, 400000, 'active'),
    (v_user_id, 'Siti Nurhaliza', 'EMP002', v_position_staff, 5000000, 500000, 300000, 600000, 400000, 'active'),
    (v_user_id, 'Ahmad Hidayat', 'EMP003', v_position_supervisor, 8000000, 800000, 500000, 0, 600000, 'active'),
    (v_user_id, 'Dewi Lestari', 'EMP004', v_position_supervisor, 8000000, 800000, 500000, 600000, 600000, 'active'),
    (v_user_id, 'Rudi Hartono', 'EMP005', v_position_manager, 12000000, 1200000, 800000, 0, 800000, 'active'),
    (v_user_id, 'Maya Sari', 'EMP006', v_position_manager, 12000000, 1200000, 800000, 0, 800000, 'active'),
    (v_user_id, 'Bambang Wijaya', 'EMP007', v_position_gm, 18000000, 2000000, 1500000, 0, 1000000, 'active'),
    (v_user_id, 'Linda Kusuma', 'EMP008', v_position_staff, 5000000, 500000, 300000, 600000, 400000, 'active'),
    (v_user_id, 'Eko Prasetyo', 'EMP009', v_position_supervisor, 8000000, 800000, 500000, 600000, 600000, 'active'),
    (v_user_id, 'Rina Wati', 'EMP010', v_position_staff, 5000000, 500000, 300000, 0, 400000, 'active')
  ON CONFLICT (user_id, employee_code) DO UPDATE
    SET 
      name = EXCLUDED.name,
      job_position_id = EXCLUDED.job_position_id,
      basic_salary = EXCLUDED.basic_salary,
      transport_allowance = EXCLUDED.transport_allowance,
      communication_allowance = EXCLUDED.communication_allowance,
      motorcycle_rental = EXCLUDED.motorcycle_rental,
      meal_allowance = EXCLUDED.meal_allowance,
      status = EXCLUDED.status;

  -- Get employee IDs
  SELECT id INTO v_emp1_id FROM employees WHERE user_id = v_user_id AND employee_code = 'EMP001' LIMIT 1;
  SELECT id INTO v_emp2_id FROM employees WHERE user_id = v_user_id AND employee_code = 'EMP002' LIMIT 1;
  SELECT id INTO v_emp3_id FROM employees WHERE user_id = v_user_id AND employee_code = 'EMP003' LIMIT 1;
  SELECT id INTO v_emp4_id FROM employees WHERE user_id = v_user_id AND employee_code = 'EMP004' LIMIT 1;
  SELECT id INTO v_emp5_id FROM employees WHERE user_id = v_user_id AND employee_code = 'EMP005' LIMIT 1;
  SELECT id INTO v_emp6_id FROM employees WHERE user_id = v_user_id AND employee_code = 'EMP006' LIMIT 1;
  SELECT id INTO v_emp8_id FROM employees WHERE user_id = v_user_id AND employee_code = 'EMP008' LIMIT 1;
  SELECT id INTO v_emp9_id FROM employees WHERE user_id = v_user_id AND employee_code = 'EMP009' LIMIT 1;

  -- Insert Sample Loans
  INSERT INTO employee_loans (user_id, employee_id, amount, remaining_amount, monthly_deduction, start_date, status, notes)
  VALUES
    (v_user_id, v_emp1_id, 10000000, 7000000, 1000000, '2024-10-01', 'active', 'Pinjaman untuk renovasi rumah'),
    (v_user_id, v_emp2_id, 5000000, 2500000, 500000, '2024-11-01', 'active', 'Pinjaman pendidikan anak'),
    (v_user_id, v_emp3_id, 15000000, 9000000, 1500000, '2024-09-01', 'active', 'Pinjaman modal usaha'),
    (v_user_id, v_emp8_id, 8000000, 4000000, 800000, '2024-10-15', 'active', 'Pinjaman emergency'),
    (v_user_id, v_emp9_id, 12000000, 0, 1200000, '2024-01-01', 'paid_off', 'Pinjaman kendaraan - Lunas')
  ON CONFLICT DO NOTHING;

  -- Insert Sample Salary Payments (last 3 months)
  -- November 2024
  INSERT INTO salary_payments (
    user_id, employee_id, payment_date, period_month, period_year,
    basic_salary, transport_allowance, communication_allowance, motorcycle_rental, meal_allowance,
    bonus, loan_deduction, total_salary, notes
  )
  VALUES
    (v_user_id, v_emp1_id, '2024-11-30', 11, 2024, 5000000, 500000, 300000, 0, 400000, 500000, 1000000, 5700000, 'Bonus kinerja bulan November'),
    (v_user_id, v_emp2_id, '2024-11-30', 11, 2024, 5000000, 500000, 300000, 600000, 400000, 0, 500000, 6300000, 'Gaji November'),
    (v_user_id, v_emp3_id, '2024-11-30', 11, 2024, 8000000, 800000, 500000, 0, 600000, 1000000, 1500000, 9400000, 'Bonus project selesai'),
    (v_user_id, v_emp4_id, '2024-11-30', 11, 2024, 8000000, 800000, 500000, 600000, 600000, 0, 0, 10500000, 'Gaji November'),
    (v_user_id, v_emp5_id, '2024-11-30', 11, 2024, 12000000, 1200000, 800000, 0, 800000, 2000000, 0, 16800000, 'Bonus target tercapai')
  ON CONFLICT DO NOTHING;

  -- October 2024
  INSERT INTO salary_payments (
    user_id, employee_id, payment_date, period_month, period_year,
    basic_salary, transport_allowance, communication_allowance, motorcycle_rental, meal_allowance,
    bonus, loan_deduction, total_salary, notes
  )
  VALUES
    (v_user_id, v_emp1_id, '2024-10-31', 10, 2024, 5000000, 500000, 300000, 0, 400000, 0, 1000000, 5200000, 'Gaji Oktober'),
    (v_user_id, v_emp2_id, '2024-10-31', 10, 2024, 5000000, 500000, 300000, 600000, 400000, 0, 500000, 6300000, 'Gaji Oktober'),
    (v_user_id, v_emp3_id, '2024-10-31', 10, 2024, 8000000, 800000, 500000, 0, 600000, 0, 1500000, 8400000, 'Gaji Oktober')
  ON CONFLICT DO NOTHING;

  -- September 2024
  INSERT INTO salary_payments (
    user_id, employee_id, payment_date, period_month, period_year,
    basic_salary, transport_allowance, communication_allowance, motorcycle_rental, meal_allowance,
    bonus, loan_deduction, total_salary, notes
  )
  VALUES
    (v_user_id, v_emp1_id, '2024-09-30', 9, 2024, 5000000, 500000, 300000, 0, 400000, 300000, 1000000, 5500000, 'Gaji September + bonus'),
    (v_user_id, v_emp3_id, '2024-09-30', 9, 2024, 8000000, 800000, 500000, 0, 600000, 0, 1500000, 8400000, 'Gaji September')
  ON CONFLICT DO NOTHING;

END $$;