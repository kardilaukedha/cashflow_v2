/*
  # Create Default Admin User
  
  1. Purpose
    - Creates default admin user with email admin@admin.com
    - Sets password to 'password'
    - Creates user_profiles entry with role 'superadmin'
  
  2. Security
    - Uses Supabase auth.users table
    - Password is hashed by Supabase
    - Creates corresponding user_profiles entry
    
  3. Notes
    - This user is for initial setup and testing
    - User should change password after first login
    - User will have full superadmin privileges
*/

-- Create admin user in auth.users if not exists
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check if admin@admin.com exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@admin.com';
  
  -- If not exists, create it
  IF v_user_id IS NULL THEN
    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@admin.com',
      crypt('password', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Super Admin"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_user_id;
    
    -- Insert into user_profiles
    INSERT INTO user_profiles (user_id, full_name, role)
    VALUES (v_user_id, 'Super Admin', 'superadmin')
    ON CONFLICT (user_id) DO UPDATE
    SET role = 'superadmin', full_name = 'Super Admin';
    
  ELSE
    -- User exists, ensure profile is set correctly
    INSERT INTO user_profiles (user_id, full_name, role)
    VALUES (v_user_id, 'Super Admin', 'superadmin')
    ON CONFLICT (user_id) DO UPDATE
    SET role = 'superadmin', full_name = 'Super Admin';
  END IF;
END $$;