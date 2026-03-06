/*
  # Add bonus field to salary_payments table

  1. Changes
    - Add `bonus` column to `salary_payments` table to track bonus/incentive payments
    - Update existing records to have bonus = 0 by default

  2. Notes
    - This is a non-destructive migration that adds a new column
    - Existing data remains intact
*/

-- Add bonus column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'salary_payments' AND column_name = 'bonus'
  ) THEN
    ALTER TABLE salary_payments ADD COLUMN bonus numeric(15,2) DEFAULT 0 NOT NULL;
  END IF;
END $$;
