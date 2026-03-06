/*
  # Populate user_id for existing transactions
  
  1. Changes
    - Set user_id for existing transactions to the superadmin user
    - This ensures existing transactions remain visible
    
  2. Notes
    - Only updates transactions where user_id is NULL
    - Uses the first superadmin found
*/

-- Update existing transactions with NULL user_id to first superadmin
DO $$
DECLARE
  superadmin_id uuid;
BEGIN
  -- Get first superadmin user
  SELECT user_id INTO superadmin_id
  FROM user_profiles
  WHERE role = 'superadmin'
  LIMIT 1;

  -- Update transactions with NULL user_id
  IF superadmin_id IS NOT NULL THEN
    UPDATE transactions
    SET user_id = superadmin_id
    WHERE user_id IS NULL;
  END IF;
END $$;
