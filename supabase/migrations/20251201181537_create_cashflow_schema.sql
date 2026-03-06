/*
  # Cashflow Application Schema

  ## Overview
  Complete database schema for cashflow tracking application with categories,
  transactions, and user authentication support.

  ## New Tables
  
  ### 1. `categories`
  Master table for transaction categories
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `name` (text) - Category name (e.g., "Makanan", "Transport")
  - `type` (text) - Category type: "income" or "expense"
  - `color` (text) - Hex color code for visual distinction
  - `icon` (text) - Icon name from lucide-react
  - `is_default` (boolean) - Whether this is a default/system category
  - `created_at` (timestamptz) - Creation timestamp
  
  ### 2. `transactions`
  Main table for all cashflow transactions
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `category_id` (uuid, foreign key) - References categories
  - `date` (date) - Transaction date
  - `description` (text) - Transaction description
  - `amount` (numeric) - Transaction amount (positive for both income/expense)
  - `type` (text) - Transaction type: "income" or "expense"
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  
  ### Row Level Security (RLS)
  - Enable RLS on all tables
  - Users can only access their own data
  - Authenticated users required for all operations
  
  ### Policies
  - SELECT: Users can view their own categories and transactions
  - INSERT: Users can create their own categories and transactions
  - UPDATE: Users can update their own categories and transactions
  - DELETE: Users can delete their own categories and transactions (except default categories)

  ## Indexes
  - Index on user_id for fast user data queries
  - Index on category_id for fast category filtering
  - Index on date for efficient date range queries
  - Composite index on (user_id, date) for dashboard queries

  ## Default Data
  - Pre-populate default categories for new users
  - Expense categories: Makanan, Transport, Tagihan, Belanja, Hiburan, Kesehatan, Pendidikan, Lainnya
  - Income categories: Gaji, Bonus, Investasi, Bisnis, Lainnya
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  color text NOT NULL DEFAULT '#6366f1',
  icon text NOT NULL DEFAULT 'Circle',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_category UNIQUE (user_id, name, type)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE RESTRICT NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  amount numeric(15, 2) NOT NULL CHECK (amount > 0),
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories table
CREATE POLICY "Users can view own categories"
  ON categories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own non-default categories"
  ON categories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND is_default = false);

-- RLS Policies for transactions table
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on transactions
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create default categories for new users
CREATE OR REPLACE FUNCTION create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  -- Expense categories
  INSERT INTO categories (user_id, name, type, color, icon, is_default) VALUES
    (NEW.id, 'Makanan', 'expense', '#ef4444', 'UtensilsCrossed', true),
    (NEW.id, 'Transport', 'expense', '#f59e0b', 'Car', true),
    (NEW.id, 'Tagihan', 'expense', '#8b5cf6', 'Receipt', true),
    (NEW.id, 'Belanja', 'expense', '#ec4899', 'ShoppingBag', true),
    (NEW.id, 'Hiburan', 'expense', '#06b6d4', 'Music', true),
    (NEW.id, 'Kesehatan', 'expense', '#10b981', 'Heart', true),
    (NEW.id, 'Pendidikan', 'expense', '#3b82f6', 'BookOpen', true),
    (NEW.id, 'Lainnya', 'expense', '#6b7280', 'MoreHorizontal', true);
  
  -- Income categories
  INSERT INTO categories (user_id, name, type, color, icon, is_default) VALUES
    (NEW.id, 'Gaji', 'income', '#22c55e', 'Wallet', true),
    (NEW.id, 'Bonus', 'income', '#84cc16', 'Gift', true),
    (NEW.id, 'Investasi', 'income', '#14b8a6', 'TrendingUp', true),
    (NEW.id, 'Bisnis', 'income', '#f97316', 'Briefcase', true),
    (NEW.id, 'Lainnya', 'income', '#6b7280', 'MoreHorizontal', true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default categories when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_categories();