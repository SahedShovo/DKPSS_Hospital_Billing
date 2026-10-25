import { eq, sql } from 'drizzle-orm';
import { bills } from '../../database/schema';
import { BillType } from '../enums/bill-type.enum';
import { formatSequenceCode, billPrefixFor } from './code-generator.util';

/**
 * Generate the next bill number while holding a PostgreSQL transaction lock.
 * This keeps concurrent API instances from selecting the same MAX()+1 value.
 */
export async function nextBillNumber(tx: any, billType: BillType): Promise<string> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(174203, 1)`);
  const [{ lastNumber }] = await tx
    .select({ lastNumber: sql<number>`COALESCE(MAX(CAST(SUBSTRING(${bills.billNo} FROM 3) AS INTEGER)), 0)` })
    .from(bills)
    .where(eq(bills.billType, billType));

  return formatSequenceCode(billPrefixFor(billType), Number(lastNumber) + 1);
}
