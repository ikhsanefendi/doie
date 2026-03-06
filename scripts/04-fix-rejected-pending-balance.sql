-- Fix rejected subscription transactions that still have pending balance
-- This script should be run once to clean up any rejected transactions 
-- where the pending balance wasn't restored

-- For each rejected subscribe_app transaction, calculate and update the user's pending balance
-- First, let's identify users who have rejected subscribe_app transactions
WITH rejected_subscriptions AS (
  SELECT 
    t.user_id,
    COALESCE(SUM(t.amount), 0) as total_rejected_amount
  FROM transactions t
  WHERE t.type = 'subscribe_app' 
    AND t.status = 'rejected'
  GROUP BY t.user_id
),
-- Calculate current pending balance issues
pending_issues AS (
  SELECT 
    u.id,
    u.pending_voucher_balance,
    COALESCE(rs.total_rejected_amount, 0) as rejected_pending_amount,
    u.pending_voucher_balance - COALESCE(rs.total_rejected_amount, 0) as corrected_pending_balance
  FROM users u
  LEFT JOIN rejected_subscriptions rs ON u.id = rs.user_id
  WHERE COALESCE(rs.total_rejected_amount, 0) > 0
)
-- Update users with corrected pending balance
UPDATE users u
SET pending_voucher_balance = pi.corrected_pending_balance
FROM pending_issues pi
WHERE u.id = pi.id
  AND pi.rejected_pending_amount > 0;
