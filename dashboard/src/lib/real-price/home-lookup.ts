/**
 * From an address someone typed to the home it is (homes table, built by
 * pipeline/src/build-homes.ts), so every feature reads one home's sales,
 * listings and planning by its home_id.
 */
import { addressKey, sameArea } from './address';
import { getPool } from './pool';

export interface HomeRow {
  home_id: string;
  /** Its page: /home/<slug> */
  slug?: string | null;
  county: string;
  area_key: string;
  address_key: string;
  address: string;
  street_slug: string | null;
  sales: number;
  listings: number;
  planning: number;
  last_sold: string | null;
  last_price: number | null;
}

/**
 * The homes an address could be: the same house and street, in the district
 * or town it names when it names one. `county` narrows it (the price check
 * and report are Dublin's). Empty without a database or a house number.
 */
export async function resolveHomes(address: string, county?: string): Promise<HomeRow[]> {
  const db = getPool();
  const key = addressKey(address);
  if (!db || !key.specific) return [];
  try {
    const { rows } = await db.query<HomeRow>(
      `SELECT home_id, slug, county, area_key, address_key, address, street_slug, sales, listings, planning,
              last_sold::text, last_price
         FROM homes WHERE address_key = $1 AND ($2::text IS NULL OR county = $2)
        ORDER BY sales DESC, last_sold DESC NULLS LAST LIMIT 40`,
      [key.key, county ?? null]
    );
    // An address with only a house and street ("12 Main Street") could be any of them
    const namesPlace = key.district !== null || address.split(',').length > 1;
    if (!namesPlace) return rows;
    // The address names a district: that district's homes
    if (key.district) {
      const inDistrict = rows.filter((h) => h.area_key === key.district || h.home_id.split('|')[1] === key.district);
      if (inDistrict.length) return inDistrict;
    }
    // The homes where any of the ways the sources wrote them names the same place
    // ("Swords" in a listing, "Kinsealy" on the register: the same home)
    const { rows: spellings } = await db.query<{ home_id: string; address: string }>(
      `SELECT home_id, address FROM register_sales WHERE home_id = ANY($1)
       UNION SELECT home_id, address FROM listings WHERE home_id = ANY($1)`,
      [rows.map((h) => h.home_id)]
    );
    const agrees = new Set(spellings.filter((x) => sameArea(x.address, address)).map((x) => x.home_id));
    return rows.filter((h) => agrees.has(h.home_id) || sameArea(h.address, address));
  } catch {
    // The homes table arrives with its migration; until then callers fall back
    return [];
  }
}

/** The one home an address is, when it resolves to exactly one. */
export async function resolveHome(address: string, county?: string): Promise<HomeRow | null> {
  const homes = await resolveHomes(address, county);
  return homes.length === 1 ? homes[0] : null;
}
