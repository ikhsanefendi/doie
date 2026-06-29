const { Client } = require('pg');

const sql = `
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
`;

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // Run each SQL statement separately
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.trim());
        await client.query(statement.trim());
      }
    }
    
    console.log('Migration completed successfully!');
    
    // Verify the migration
    const result = await client.query('SELECT label, "order" FROM menu_items ORDER BY "order"');
    console.log('\nVerification - Menu items with order:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

runMigration();
