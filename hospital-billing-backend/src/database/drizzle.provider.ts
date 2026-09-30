import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';

neonConfig.webSocketConstructor = ws;

export const DRIZZLE = 'DRIZZLE_CONNECTION';

export const drizzleProvider = {
  provide: DRIZZLE,
  useFactory: () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    return drizzle(pool, { schema });
  },
};