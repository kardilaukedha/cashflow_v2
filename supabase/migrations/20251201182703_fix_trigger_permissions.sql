/*
  # Fix Trigger Permissions for Default Categories

  ## Changes
  1. Drop existing trigger and function
  2. Recreate function with proper permissions to bypass RLS
  3. Recreate trigger on auth.users table

  ## Notes
  - Function uses SECURITY DEFINER to bypass RLS when creating default categories
  - This allows the trigger to insert categories for new users automatically
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_default_categories();

-- Recreate function with proper permissions
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Expense categories
  INSERT INTO public.categories (user_id, name, type, color, icon, is_default) VALUES
    (NEW.id, 'Makanan', 'expense', '#ef4444', 'UtensilsCrossed', true),
    (NEW.id, 'Transport', 'expense', '#f59e0b', 'Car', true),
    (NEW.id, 'Tagihan', 'expense', '#8b5cf6', 'Receipt', true),
    (NEW.id, 'Belanja', 'expense', '#ec4899', 'ShoppingBag', true),
    (NEW.id, 'Hiburan', 'expense', '#06b6d4', 'Music', true),
    (NEW.id, 'Kesehatan', 'expense', '#10b981', 'Heart', true),
    (NEW.id, 'Pendidikan', 'expense', '#3b82f6', 'BookOpen', true),
    (NEW.id, 'Lainnya', 'expense', '#6b7280', 'MoreHorizontal', true);
  
  -- Income categories
  INSERT INTO public.categories (user_id, name, type, color, icon, is_default) VALUES
    (NEW.id, 'Gaji', 'income', '#22c55e', 'Wallet', true),
    (NEW.id, 'Bonus', 'income', '#84cc16', 'Gift', true),
    (NEW.id, 'Investasi', 'income', '#14b8a6', 'TrendingUp', true),
    (NEW.id, 'Bisnis', 'income', '#f97316', 'Briefcase', true),
    (NEW.id, 'Lainnya', 'income', '#6b7280', 'MoreHorizontal', true);
  
  RETURN NEW;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_default_categories() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_categories() TO service_role;

-- Recreate trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_categories();
