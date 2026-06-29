-- Add Billing menu item for all users
INSERT INTO menu_items (id, label, href, icon, created_at, updated_at) 
VALUES 
  ('billing-menu-id', 'Billing', '/dashboard/billing', 'CreditCard', NOW(), NOW());

-- Add billing menu item to all existing roles
INSERT INTO role_menu_items (role_id, menu_item_id)
SELECT 
  id as role_id,
  'billing-menu-id' as menu_item_id
FROM roles
WHERE id NOT IN (
  SELECT role_id 
  FROM role_menu_items 
  WHERE menu_item_id = 'billing-menu-id'
);
