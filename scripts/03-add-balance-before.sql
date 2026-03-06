-- Add balance_before column to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS balance_before INT DEFAULT 0;
