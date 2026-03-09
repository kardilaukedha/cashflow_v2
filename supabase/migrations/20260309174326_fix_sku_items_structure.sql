/*
  # Fix SKU Items Table Structure
  
  Menyesuaikan struktur tabel sku_items sesuai dengan dump.sql:
  - Mengubah id dari uuid ke integer dengan sequence
  - Menambah kolom kategori dan cbp
  - Menambah kolom is_active
  - Mengubah nama kolom item menjadi nama
  
  ## Changes
  1. Drop existing sku_items table jika ada
  2. Create ulang dengan struktur yang benar
  3. Enable RLS dengan policies yang sesuai
*/

-- Drop existing sku_items table if exists
DROP TABLE IF EXISTS sku_items CASCADE;

-- Create sku_items table with correct structure
CREATE TABLE sku_items (
  id serial PRIMARY KEY,
  kode varchar(50) UNIQUE NOT NULL,
  nama varchar(255) NOT NULL,
  kategori varchar(100) NOT NULL,
  cbp integer DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sku_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can read SKU items"
  ON sku_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert SKU items"
  ON sku_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin_sariroti', 'superadmin')
  ));

CREATE POLICY "Admins can update SKU items"
  ON sku_items FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin_sariroti', 'superadmin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin_sariroti', 'superadmin')
  ));

CREATE POLICY "Admins can delete SKU items"
  ON sku_items FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin_sariroti', 'superadmin')
  ));
