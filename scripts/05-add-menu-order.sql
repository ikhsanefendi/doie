-- Add order field to menu_items table for custom menu sorting
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- Update existing menu items with default order
UPDATE menu_items SET "order" = 0 WHERE "order" IS NULL;

-- Set default order for common menu items (you can customize these values)
UPDATE menu_items SET "order" = 1 WHERE label = 'Dashboard';
UPDATE menu_items SET "order" = 2 WHERE label = 'Marketplace';
UPDATE menu_items SET "order" = 3 WHERE label = 'Billing';
UPDATE menu_items SET "order" = 4 WHERE label = 'Users';
UPDATE menu_items SET "order" = 5 WHERE label = 'Applications';
UPDATE menu_items SET "order" = 6 WHERE label = 'Transactions';
UPDATE menu_items SET "order" = 7 WHERE label = 'Subscribers';
UPDATE menu_items SET "order" = 8 WHERE label = 'Settings';
UPDATE menu_items SET "order" = 9 WHERE label = 'Audit Logs';
