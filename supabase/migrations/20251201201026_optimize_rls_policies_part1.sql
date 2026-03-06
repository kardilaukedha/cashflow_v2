/*
  # Optimize RLS Policies - Part 1 (Core Tables)
  
  1. Changes
    - Replace auth.uid() with (SELECT auth.uid()) for better performance
    - This prevents re-evaluation for each row
    - Applies to: categories, transactions, positions, employees
    
  2. Performance Impact
    - Significantly reduces query overhead at scale
    - Auth functions called once per query instead of per row
*/

-- Drop and recreate optimized policies for categories
DROP POLICY IF EXISTS "Users can view own categories" ON categories;
DROP POLICY IF EXISTS "Users can create own categories" ON categories;
DROP POLICY IF EXISTS "Users can update own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete own non-default categories" ON categories;

CREATE POLICY "Users can view own categories"
  ON categories FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create own categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own non-default categories"
  ON categories FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()) AND is_default = false);

-- Drop and recreate optimized policies for positions
DROP POLICY IF EXISTS "Users can view own positions" ON positions;
DROP POLICY IF EXISTS "Users can create own positions" ON positions;
DROP POLICY IF EXISTS "Users can update own positions" ON positions;
DROP POLICY IF EXISTS "Users can delete own positions" ON positions;

CREATE POLICY "Users can view own positions"
  ON positions FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create own positions"
  ON positions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own positions"
  ON positions FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own positions"
  ON positions FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));
