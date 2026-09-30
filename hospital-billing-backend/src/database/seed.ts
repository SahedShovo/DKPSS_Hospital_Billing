import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { hashPassword } from '../common/utils/hash.util';

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  const initialPassword = process.env.INITIAL_ADMIN_PASSWORD;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  if (!initialPassword || initialPassword.length < 12) {
    throw new Error('Set INITIAL_ADMIN_PASSWORD to a value of at least 12 characters');
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });

  const passwordHash = await hashPassword(initialPassword);

  const [admin] = await db
    .insert(schema.users)
    .values({
      username: process.env.INITIAL_ADMIN_USERNAME ?? 'admin',
      passwordHash,
      fullName: process.env.INITIAL_ADMIN_NAME ?? 'System Administrator',
      role: 'ADMIN',
    })
    .returning();

  console.log('Admin account created:', admin.username);
}

seed().then(() => process.exit(0));
