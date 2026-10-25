import { sql } from 'drizzle-orm';
import { patients } from '../../database/schema';
import { formatSequenceCode } from './code-generator.util';

/** Generate a unique next patient code inside the caller's transaction. */
export async function nextPatientCode(tx: any): Promise<string> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(174203, 2)`);
  const [{ lastNumber }] = await tx
    .select({ lastNumber: sql<number>`COALESCE(MAX(CAST(SUBSTRING(${patients.patientCode} FROM 3) AS INTEGER)), 0)` })
    .from(patients);

  return formatSequenceCode('P', Number(lastNumber) + 1);
}
