require('dotenv').config();

const { randomBytes } = require('node:crypto');
const bcrypt = require('bcrypt');
const { Pool } = require('@neondatabase/serverless');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not configured');

  const target = new URL(connectionString);
  const database = target.pathname.replace(/^\//, '');
  const confirmation = `${target.hostname}/${database}`;
  console.log(`Database reset target: ${confirmation}`);
  if (process.env.RESET_DATABASE_CONFIRM !== confirmation) {
    throw new Error(`To confirm, set RESET_DATABASE_CONFIRM="${confirmation}"`);
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  const password = randomBytes(24).toString('base64url');

  try {
    await client.query('BEGIN');
    await client.query(`
      TRUNCATE TABLE
        users,
        patients,
        doctors,
        tests,
        packages,
        package_items,
        bills,
        bill_items,
        admissions,
        shifts,
        payments,
        due_payments,
        refunds,
        expenses,
        audit_logs
      RESTART IDENTITY
    `);
    const passwordHash = await bcrypt.hash(password, 12);
    await client.query(
      'INSERT INTO users (username, password_hash, full_name, role) VALUES ($1, $2, $3, $4)',
      ['admin', passwordHash, 'System Administrator', 'ADMIN'],
    );
    await client.query('COMMIT');
    console.log(JSON.stringify({ reset: true, username: 'admin', temporaryPassword: password }));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`Database reset failed: ${error.message}`);
  process.exitCode = 1;
});
