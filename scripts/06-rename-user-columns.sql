-- Rename voucher_balance to amount_balance
ALTER TABLE users RENAME COLUMN voucher_balance TO amount_balance;

-- Rename pending_voucher_balance to pending_amount_balance  
ALTER TABLE users RENAME COLUMN pending_voucher_balance TO pending_amount_balance;

-- If columns don't exist, add them
ALTER TABLE users ADD COLUMN IF NOT EXISTS amount_balance INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_amount_balance INTEGER DEFAULT 0;
