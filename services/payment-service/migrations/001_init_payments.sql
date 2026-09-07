-- Migration 001: Initialize Payments and Idempotency Keys Tables

-- Ensure UUID generator functions are available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Safe enum declaration for payment lifecycle status
DO $$
BEGIN
  CREATE TYPE payment_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'REFUNDED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Safe enum declaration for idempotency status
DO $$
BEGIN
  CREATE TYPE idempotency_status AS ENUM (
    'STARTED',
    'COMPLETED',
    'FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Payments master table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status payment_status NOT NULL DEFAULT 'PENDING',
  payment_method VARCHAR(50) NOT NULL DEFAULT 'card',
  transaction_id VARCHAR(255),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotency keys table to guarantee exactly-once payment processing
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  request_path VARCHAR(255) NOT NULL,
  request_params_hash VARCHAR(64) NOT NULL,
  response_code INTEGER,
  response_body JSONB,
  status idempotency_status NOT NULL DEFAULT 'STARTED',
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance & Lookup Indexes for Payments
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Performance & Lookup Indexes for Idempotency Keys
CREATE INDEX IF NOT EXISTS idx_idempotency_user_id ON idempotency_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_created_at ON idempotency_keys(created_at DESC);
