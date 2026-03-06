import { hash } from 'bcrypt';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedSuperAdmin() {
  try {
    console.log('Seeding SuperAdmin user...');

    // Hash the password
    const hashedPassword = await hash('Sidoarjo1!', 10);

    // Get SuperAdmin role
    const roleResult = await pool.query(
      'SELECT id FROM roles WHERE name = $1',
      ['SuperAdmin']
    );

    if (roleResult.rows.length === 0) {
      console.error('SuperAdmin role not found. Please run schema migration first.');
      process.exit(1);
    }

    const superAdminRoleId = roleResult.rows[0].id;

    // Create or update Ikhsane superadmin
    const userId = '00000000-0000-0000-0000-000000000001';
    
    await pool.query(
      `INSERT INTO users (id, email, password_hash, name, role_id, voucher_balance, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = $3,
         name = $4,
         role_id = $5,
         is_active = $7
       WHERE users.email = $2`,
      [
        userId,
        'ikhsane@doiehub.local',
        hashedPassword,
        'Ikhsane',
        superAdminRoleId,
        1000,
        true,
      ]
    );

    console.log('✓ SuperAdmin user created/updated successfully');
    console.log('Email: ikhsane@doiehub.local');
    console.log('Password: Sidoarjo1!');

    await pool.end();
  } catch (error) {
    console.error('Error seeding SuperAdmin:', error);
    process.exit(1);
  }
}

seedSuperAdmin();
