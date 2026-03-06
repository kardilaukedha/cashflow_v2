/*
  # Add User Tracking to Transactions
  
  1. Changes
    - Add user_id column to transactions table
    - Add foreign key constraint to user_profiles
    - Update RLS policies to filter by user_id
    - Create index for better query performance
    
  2. Security
    - Users can only see their own transactions
    - Superadmin can see all transactions
    - Maintain existing RLS structure
*/

-- Add user_id column to transactions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete transactions" ON transactions;

-- Create new RLS policies with user filtering
CREATE POLICY "Users can view own transactions or superadmin sees all"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  );

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own transactions or superadmin updates all"
  ON transactions FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  );

CREATE POLICY "Users can delete own transactions or superadmin deletes all"
  ON transactions FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  );
