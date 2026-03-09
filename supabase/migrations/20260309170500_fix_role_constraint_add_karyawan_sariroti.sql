/*
  # Fix Role Constraint
  
  1. Changes
    - Update user_profiles role CHECK constraint to include 'karyawan_sariroti'
    
  2. Notes
    - Application code uses 'karyawan_sariroti' role extensively
    - Without this fix, creating users with that role would fail
*/

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
  CHECK (role = ANY (ARRAY['superadmin', 'admin_keuangan', 'admin_sariroti', 'karyawan', 'karyawan_sariroti']));