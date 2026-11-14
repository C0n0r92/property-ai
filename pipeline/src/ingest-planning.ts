/**
 * Planning applications in Dublin from the national planning applications
 * database (ArcGIS feature service, Department of Housing, CC BY 4.0).
 * Refreshes every Dublin application each run (about 120,000, 2,000 a
 * request), since decisions and appeals change after an application is in.
 *
 *   npm run ingest:planning
 */
import { decisionOf, kindsOf, planningSite } from '../../dashboard/src/lib/real-price/planning.ts';
import { bulkInsert, pool, runJob } from './db.ts';

const SERVICE =
  'https://services.arcgis.com/NzlPQPKn5QF9v2US/arcgis/rest/services/IrishPlanningApplications/FeatureServer/0/query';
const COUNCILS = [
  'Dublin City Council',
  'Dun Laoghaire Rathdown County Council',
  'Fingal County Council',
  'South Dublin County Council',
];
// Not the applicant's name or address: only what the development is
const FIELDS = [
  'PlanningAuthority',
  'ApplicationNumber',
  'DevelopmentDescription',
  'DevelopmentAddress',
  'ApplicationType',
  'Decision',
  'ReceivedDate',
  'DecisionDate',
  'NumResidentialUnits',
  'LinkAppDetails',
];
const PAGE = 2000;

interface Feature {
  attributes: Record<string, string | number | null>;
  geometry?: { x: number; y: number };
}

const day = (ms: unknown) => (typeof ms === 'number' ? new Date(ms).toISOString().slice(0, 10) : null);
const text = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() || null : null);

async function fetchPage(offset: number): Promise<Feature[]> {
  const params = new URLSearchParams({
    where: `PlanningAuthority IN (${COUNCILS.map((c) => `'${c}'`).join(',')})`,
    outFields: FIELDS.join(','),
    orderByFields: 'OBJECTID',
    resultOffset: String(offset),
    resultRecordCount: String(PAGE),
    outSR: '4326',
    f: 'json',
  });
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(`${SERVICE}?${params}`, { signal: AbortSignal.timeout(90_000) });
      const data = (await res.json()) as { features?: Feature[]; error?: { message: string } };
      if (!res.ok || data.error) throw new Error(data.error?.message ?? `HTTP ${res.status}`);
      return data.features ?? [];
    } catch (error) {
      if (attempt >= 3) throw error;
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
    }
  }
}

export async function ingestPlanning(): Promise<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  for (let offset = 0; ; offset += PAGE) {
    const features = await fetchPage(offset);
    for (const { attributes: a, geometry: g } of features) {
      const address = text(a.DevelopmentAddress);
      const number = text(a.ApplicationNumber);
      const authority = text(a.PlanningAuthority);
      if (!address || !number || !authority) continue;
      const id = `${authority}|${number}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const site = planningSite(address);
      const description = text(a.DevelopmentDescription);
      rows.push({
        id,
        authority,
        app_number: number,
        address,
        home_key: site.homeKey,
        district: site.district,
        street_slug: site.streetSlug,
        description: description?.slice(0, 4000) ?? null,
        kinds: kindsOf(description),
        app_type: text(a.ApplicationType),
        decision: decisionOf(text(a.Decision)),
        decision_raw: text(a.Decision),
        received_date: day(a.ReceivedDate),
        decision_date: day(a.DecisionDate),
        units: typeof a.NumResidentialUnits === 'number' ? a.NumResidentialUnits : null,
        lat: g && Number.isFinite(g.y) ? g.y : null,
        lng: g && Number.isFinite(g.x) ? g.x : null,
        link: text(a.LinkAppDetails),
      });
    }
    if (features.length < PAGE) break;
  }
  if (rows.length < 50_000) throw new Error(`Only ${rows.length} applications came back; not replacing the table`);

  const written = await bulkInsert(
    'planning_applications',
    {
      id: 'text', authority: 'text', app_number: 'text', address: 'text', home_key: 'text', district: 'text',
      street_slug: 'text', description: 'text', kinds: 'text[]', app_type: 'text', decision: 'text',
      decision_raw: 'text', received_date: 'date', decision_date: 'date', units: 'int', lat: 'float8', lng: 'float8',
      link: 'text',
    },
    rows,
    `ON CONFLICT (id) DO UPDATE SET address = EXCLUDED.address, home_key = EXCLUDED.home_key, district = EXCLUDED.district,
       street_slug = EXCLUDED.street_slug, description = EXCLUDED.description, kinds = EXCLUDED.kinds,
       app_type = EXCLUDED.app_type, decision = EXCLUDED.decision, decision_raw = EXCLUDED.decision_raw,
       received_date = EXCLUDED.received_date, decision_date = EXCLUDED.decision_date, units = EXCLUDED.units,
       lat = EXCLUDED.lat, lng = EXCLUDED.lng, link = EXCLUDED.link, updated_at = NOW()`
  );

  // The street page a home is on: the register's street for the same home wins
  const matched = await pool.query(
    `UPDATE planning_applications p SET street_slug = r.street_slug
       FROM (SELECT DISTINCT ON (address_key, district) address_key, district, street_slug
               FROM register_sales WHERE street_slug IS NOT NULL ORDER BY address_key, district, sold_date DESC) r
      WHERE p.home_key = r.address_key AND (p.district IS NOT DISTINCT FROM r.district OR p.district IS NULL)
        AND p.street_slug IS DISTINCT FROM r.street_slug`
  );
  return { applications: rows.length, written, homes: rows.filter((r) => r.home_key).length, streetFromRegister: matched.rowCount };
}

// Run directly; --if-empty (used at deploy) only fills an empty table, the daily job refreshes it
if (import.meta.url === `file://${process.argv[1]}`) {
  const empty = Number((await pool.query('SELECT COUNT(*) AS n FROM planning_applications')).rows[0].n) === 0;
  if (!process.argv.includes('--if-empty') || empty) await runJob('ingest-planning', () => ingestPlanning());
  else console.log('ingest-planning: table already filled, left to the daily job');
  await pool.end();
}
