/**
 * Planning applications from the database, for street pages and the report.
 * (planning.ts holds the shared parsing; this file reads what was stored.)
 */
import { addressKey } from './address';
import { tidyAddress } from './model';
import { resolveHome } from './home-lookup';
import { getPool } from './pool';

export interface PlanningRow {
  appNumber: string;
  authority: string;
  address: string;
  description: string;
  kinds: string[];
  decision: string;
  received: string | null;
  decided: string | null;
}

interface Raw {
  app_number: string;
  authority: string;
  address: string;
  description: string | null;
  kinds: string[];
  decision: string;
  received: string | null;
  decided: string | null;
}

const toRow = (r: Raw): PlanningRow => ({
  appNumber: r.app_number,
  authority: r.authority,
  address: tidyAddress(r.address.replace(/\s*,?\s*(?:[AC-FHKNPRTV-Y]\d{2}|D6W)\s?[0-9AC-FHKNPRTV-Y]{4}\s*$/i, '')),
  description: (r.description ?? '').trim(),
  kinds: r.kinds ?? [],
  decision: r.decision,
  received: r.received,
  decided: r.decided,
});

const COLUMNS = `app_number, authority, address, description, kinds, decision, received_date::text AS received, decision_date::text AS decided`;

/** Applications on a street (invalid ones left out), newest first. */
export async function streetPlanning(slug: string, limit = 40): Promise<{ rows: PlanningRow[]; total: number }> {
  const db = getPool();
  if (!db) return { rows: [], total: 0 };
  try {
    const [rows, total] = await Promise.all([
      db.query<Raw>(
        `SELECT ${COLUMNS} FROM planning_applications
          WHERE street_slug = $1 AND decision <> 'invalid'
          ORDER BY received_date DESC NULLS LAST LIMIT $2`,
        [slug, limit]
      ),
      db.query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM planning_applications WHERE street_slug = $1 AND decision <> 'invalid'`,
        [slug]
      ),
    ]);
    return { rows: rows.rows.map(toRow), total: total.rows[0]?.n ?? 0 };
  } catch {
    // The table arrives with the planning migration; pages work without it
    return { rows: [], total: 0 };
  }
}

/** Applications for one home (by house number and street), for the report. */
export async function homePlanning(address: string): Promise<PlanningRow[]> {
  const db = getPool();
  const key = addressKey(address);
  if (!db || !key.specific) return [];
  // One home (homes table): its applications exactly
  const home = await resolveHome(address, 'Dublin');
  if (home) {
    const { rows } = await db
      .query<Raw>(
        `SELECT ${COLUMNS} FROM planning_applications
          WHERE home_id = $1 AND decision <> 'invalid' ORDER BY received_date DESC NULLS LAST LIMIT 20`,
        [home.home_id]
      )
      .catch(() => ({ rows: [] as Raw[] }));
    return rows.map(toRow);
  }
  try {
    const { rows } = await db.query<Raw & { district: string | null }>(
      `SELECT ${COLUMNS}, district FROM planning_applications
        WHERE home_key = $1 AND decision <> 'invalid'
        ORDER BY received_date DESC NULLS LAST LIMIT 20`,
      [key.key]
    );
    return rows.filter((r) => !key.district || !r.district || r.district === key.district).map(toRow);
  } catch {
    return [];
  }
}

const DECISION_WORDS: Record<string, string> = {
  granted: 'Granted',
  part: 'Partly granted',
  refused: 'Refused',
  withdrawn: 'Withdrawn',
  pending: 'Decision pending',
  other: 'Other',
};
export const decisionWord = (d: string) => DECISION_WORDS[d] ?? d;

/** A short line for what the work is: its kinds, or the start of the description. */
export function workSummary(row: PlanningRow, max = 140): string {
  if (row.kinds.length) {
    const words: Record<string, string> = {
      extension: 'extension',
      attic: 'attic or dormer',
      'new homes': 'new homes',
      'change of use': 'change of use',
      demolition: 'demolition',
      solar: 'solar panels',
      driveway: 'driveway or vehicle access',
    };
    const list = row.kinds.map((k) => words[k] ?? k);
    const text = list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list[0];
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  const d = row.description.replace(/\s+/g, ' ');
  return d.length > max ? `${d.slice(0, max).replace(/\s+\S*$/, '')}…` : d;
}
