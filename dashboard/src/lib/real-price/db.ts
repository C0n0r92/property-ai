import { getPool } from './pool';

const TABLES = {
  real_price_homes: ['address', 'eircode', 'area_key', 'type_group', 'beds', 'asking_price', 'source'],
  real_price_leads: ['email', 'query', 'marketing_consent', 'emailed'],
} as const;

type Table = keyof typeof TABLES;

/**
 * Insert a row into a known table with a parameterised query. Never throws,
 * so saving can never block a sale or an answer.
 */
export async function insertRow(
  table: Table,
  row: Partial<Record<(typeof TABLES)[Table][number], unknown>>
): Promise<boolean> {
  const db = getPool();
  if (!db) return false;
  const columns = TABLES[table].filter((c) => c in row);
  const values = columns.map((c) => {
    const value = (row as Record<string, unknown>)[c];
    return value !== null && typeof value === 'object' ? JSON.stringify(value) : (value ?? null);
  });
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  try {
    await db.query(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`, values);
    return true;
  } catch (error) {
    console.error(`Insert into ${table} failed:`, error instanceof Error ? error.message : error);
    return false;
  }
}
