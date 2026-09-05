-- Migration 001: Initialize Orders and Order Items Tables

-- Ensure UUID generator functions are available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Safe enum declaration for order lifecycle status
DO $$
BEGIN
  CREATE TYPE order_status AS ENUM (
    'PENDING',
    'PAYMENT_PENDING',
    'CONFIRMED',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Orders master table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  status order_status NOT NULL DEFAULT 'PENDING',
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Order items line items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
