/**
 * One identity per home across every dataset: register sales, listings,
 * planning applications, matched sales and alerts.
 *
 * home_id = county | area | house-and-street key, where the area is resolved
 * by running the street assignment (streets.ts) over every source's addresses
 * together, so a register sale written without its postal district and a
 * listing written with it land on the same home. Where an estate-style street
 * name is split by estate or town ("Main Street, Howth" and "Main Street,
 * Baldoyle", both Dublin 13), the street page is part of the id so the two
 * stay apart. No house number, no home: such an address could be many homes.
 *
 * Shared with the pipeline (pipeline/src/build-homes.ts).
 */
import { addressKey } from './address';
import { assignStreets, streetSlug } from './streets';

const HOME = /^(?:(?:APT|UNIT|FLAT) \d+[A-Z]?(?: \d+[A-Z]?)? [A-Z]|\d+[A-Z]? [A-Z])/;

export interface HomeRecord {
  address: string;
  /** Dublin postal district when the source gives one ('d8') */
  district?: string | null;
}

export interface HomeIdentity {
  homeId: string;
  areaKey: string;
  addressKey: string;
  streetSlug: string | null;
}

/** Home identities for one county's records (any mix of sources), in order. */
export function homeIdentities(records: HomeRecord[], county: string): Array<HomeIdentity | null> {
  const streets = assignStreets(
    records.map((r) => r.address),
    county
  );
  return records.map((r, i) => {
    const key = addressKey(r.address);
    if (!HOME.test(key.key) || /\bDUBLIN\b/.test(key.key)) return null;
    const s = streets[i];
    const district = county === 'Dublin' ? (r.district ?? key.district) : null;
    const areaKey = s?.areaKey ?? district ?? `county:${county}`;
    // A split estate name: its street page tells the two streets apart
    const split = s && s.slug !== streetSlug(s.streetKey, s.areaKey);
    return {
      homeId: [county, areaKey, key.key, split ? s.slug : ''].filter(Boolean).join('|'),
      areaKey,
      addressKey: key.key,
      streetSlug: s?.slug ?? null,
    };
  });
}

export interface ReconcileRecord {
  table: string;
  homeId: string | null;
  addressKey: string;
  eircode?: string | null;
}

const mostCommon = (values: string[]) => {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
};

/**
 * Join up homes that the sources name differently ("Kinsealy" and "Swords",
 * "Dún Laoghaire" and "Monkstown"), after the area-based ids:
 *  1. The same Eircode is the same home; the register's id for it wins.
 *  2. A house and street found as exactly one home on the county's register
 *     takes any other source's record of that house and street that isn't
 *     itself a register home. A key found as two or more register homes
 *     ("41 The Ash" in two estates) is left alone.
 */
export function reconcileHomes(records: ReconcileRecord[]): Array<string | null> {
  const out = records.map((r) => r.homeId);
  const isRegister = (i: number) => records[i].table === 'register_sales';

  // 1. Eircodes
  const byEircode = new Map<string, number[]>();
  records.forEach((r, i) => {
    const code = r.eircode?.replace(/\s/g, '').toUpperCase();
    if (code && /^[A-Z0-9]{7}$/.test(code) && out[i]) byEircode.set(code, [...(byEircode.get(code) ?? []), i]);
  });
  for (const group of byEircode.values()) {
    if (group.length < 2) continue;
    const register = group.filter(isRegister).map((i) => out[i]!);
    const canonical = mostCommon(register.length ? register : group.map((i) => out[i]!));
    for (const i of group) out[i] = canonical;
  }

  // 2. A house and street that is one home on the register
  const registerHomes = new Map<string, Set<string>>();
  records.forEach((r, i) => {
    if (isRegister(i) && out[i]) registerHomes.set(r.addressKey, (registerHomes.get(r.addressKey) ?? new Set()).add(out[i]!));
  });
  const allRegister = new Set([...registerHomes.values()].flatMap((s) => [...s]));
  records.forEach((r, i) => {
    if (isRegister(i) || !out[i] || allRegister.has(out[i]!)) return;
    const homes = registerHomes.get(r.addressKey);
    if (homes?.size === 1) out[i] = [...homes][0];
  });
  return out;
}
