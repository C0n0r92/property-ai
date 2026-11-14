/**
 * Streets, from Property Price Register addresses: which street a sale is
 * on, a readable name for it and a stable address for its page.
 *
 * Shared with the pipeline (pipeline/src/build-streets.ts), so it imports
 * only the other shared helpers.
 */
import { addressKey } from './address';
import { extractAreas } from './model';

export interface StreetIdentity {
  /** Normalised street, e.g. "BUTTERFIELD AVE" */
  streetKey: string;
  /** Postal district ("d14") or town ("lucan") */
  areaKey: string;
  areaLabel: string;
  /** Readable name from this address, e.g. "Butterfield Avenue" */
  name: string;
  /** Page address, e.g. "butterfield-avenue-dublin-14" */
  slug: string;
}

const EIRCODE = /\b(?:[AC-FHKNPRTV-Y]\d{2}|D6W)\s?[0-9AC-FHKNPRTV-Y]{4}\b/gi;
const UNIT = /^(?:APARTMENT|APT|UNIT|FLAT|NO)\.?\s+/i;
const NUMBERS = /^(?:\d+[A-Z]?(?:\s*[-/&]\s*\d+[A-Z]?)*\s+)+/i;

// Short forms in register names, spelled out ("St" only after the first word)
const SPELLED: Record<string, string> = {
  rd: 'Road',
  ave: 'Avenue',
  av: 'Avenue',
  dr: 'Drive',
  tce: 'Terrace',
  terr: 'Terrace',
  cres: 'Crescent',
  gdns: 'Gardens',
  pk: 'Park',
  ct: 'Court',
  sq: 'Square',
  pl: 'Place',
  ln: 'Lane',
  hts: 'Heights',
  upr: 'Upper',
  lwr: 'Lower',
  st: 'Street',
};

// The address key's short forms, spelled out for page addresses
const LONG: Record<string, string> = {
  RD: 'road',
  AVE: 'avenue',
  DR: 'drive',
  PK: 'park',
  CT: 'court',
  TCE: 'terrace',
  SQ: 'square',
  PL: 'place',
  GR: 'grove',
  CRES: 'crescent',
  GDNS: 'gardens',
  LN: 'lane',
  CL: 'close',
  HTS: 'heights',
  UPR: 'upper',
  LWR: 'lower',
  N: 'north',
  S: 'south',
  E: 'east',
  W: 'west',
};

/** "d14" -> "dublin-14"; towns are already readable. */
export function areaSlugOf(areaKey: string): string {
  const district = areaKey.match(/^d(\d{1,2}w?)$/);
  return district ? `dublin-${district[1]}` : areaKey;
}

/** Page address for a street key in an area. "ST" is Saint as the first word, Street after. */
export function streetSlug(streetKey: string, areaKey: string): string {
  const tokens = streetKey.split(' ').filter(Boolean);
  const words = tokens.map((t, i) => {
    if (t === 'ST') return i === 0 ? 'st' : 'street';
    return LONG[t] ?? t.toLowerCase();
  });
  return `${words.join('-')}-${areaSlugOf(areaKey)}`.replace(/[^a-z0-9-]+/g, '').replace(/-+/g, '-');
}

/** "13 St. Helen'S Way" -> "St. Helen's Way"; drops the house and flat number. */
export function displayStreetName(firstPart: string): string {
  let s = firstPart.replace(EIRCODE, '').trim();
  // "Apt 4 Rath Gael", "Apartment 40 7 Chamber Street"
  for (let i = 0; i < 3; i++) s = s.replace(UNIT, '').replace(NUMBERS, '').trim();
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word, i) => {
      const bare = word.replace(/\.$/, '');
      if (i > 0 && SPELLED[bare]) return SPELLED[bare];
      return word.replace(/(^|[-(])([a-z])/g, (_, pre: string, c: string) => pre + c.toUpperCase());
    })
    .join(' ')
    .replace(/\bO'([a-z])/g, (_, c: string) => `O'${c.toUpperCase()}`)
    .replace(/'S\b/g, "'s");
}

/** The address's street part as written: "Apt 4, Rath Gael" counts as one. */
function rawStreetPart(address: string): string {
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  const first = parts[0] ?? '';
  if (/^(?:apartment|apt|unit|flat|no)?\.?\s*\d+[a-z]?$/i.test(first) && parts[1] && !/^dublin/i.test(parts[1])) {
    return `${first} ${parts[1]}`;
  }
  return first;
}

/**
 * Which street an address is on, or null when it can't be told: no house
 * number (a named house), a one-word name, or no district or town.
 */
/** "Kildare" -> "kildare"; null for Dublin, whose streets keep their district or town alone. */
export function countySlug(county: string | null | undefined): string | null {
  const c = (county ?? '').trim().toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
  return c && c !== 'dublin' ? c : null;
}

const COUNTY_PART = /^(?:co\.?|county)\s+/i;

/** Towns in an address, nearest the street first: no districts, no "Co. Kildare". */
function townsOf(address: string, county: string | null): Array<{ key: string; label: string }> {
  // Not a district, and not the county: "Co. Kildare", "County Dublin", or a bare "Co." ("Rathcoole, Co., Dublin")
  const towns = extractAreas(address).filter(
    (a) => !/^d\d/.test(a.key) && !COUNTY_PART.test(a.label) && !/^(?:co|county)(?:-|$)/.test(a.key)
  );
  // A bare county name ("…, Douglas, Cork") is the county unless it is the only place given (Cork city)
  return county && towns.length > 1 ? towns.filter((t) => t.key !== county) : towns;
}

export function streetIdentity(address: string, county?: string | null): StreetIdentity | null {
  if (!address) return null;
  const outside = countySlug(county);
  const key = addressKey(address);
  if (!key.specific) return null;
  const streetKey = key.key.replace(UNIT, '').replace(NUMBERS, '').trim();
  // The number must have been in front of the street, and the street needs two words
  if (!streetKey || streetKey === key.key.replace(UNIT, '') || streetKey.split(' ').length < 2) return null;
  if (/\d/.test(streetKey)) return null;
  // "LWR MOUNT ST" and "MOUNT ST LWR" are one street
  const ordered = streetKey.replace(/^(UPR|LWR) (.+)$/, '$2 $1');

  let areaKey: string;
  let areaLabel: string;
  if (key.district && !outside) {
    areaKey = key.district;
    areaLabel = `Dublin ${key.district.slice(1).toUpperCase()}`;
  } else {
    const towns = townsOf(address, outside);
    const town = towns[towns.length - 1];
    if (!town) return null;
    const label = displayStreetName(town.label);
    // Outside Dublin the county goes with the town: Newcastle, Co. Wicklow is not Newcastle, Co. Dublin
    if (outside && town.key !== outside) {
      areaKey = `${town.key}-${outside}`;
      areaLabel = `${label}, Co. ${displayStreetName(county!)}`;
    } else {
      areaKey = town.key;
      areaLabel = label;
    }
  }
  const name = displayStreetName(rawStreetPart(address));
  if (!name) return null;
  return { streetKey: ordered, areaKey, areaLabel, name, slug: streetSlug(ordered, areaKey) };
}

export interface StreetAssignment {
  slug: string;
  streetKey: string;
  areaKey: string;
  areaLabel: string;
  name: string;
}

/**
 * Names that are several streets in one area: estate names ("The Avenue",
 * "The Green") and village streets. Long roads through several neighbourhoods
 * ("North Circular Road") are one street and never match. A name must also be
 * found in this many areas.
 */
const GENERIC_NAME = /^(?:THE .+|(?:MAIN|CHURCH|CHAPEL|BRIDGE|NEW|MILL|HIGH|STATION|GREEN|MARKET|FAIR GREEN|QUAY) (?:ST|RD|LN|STREET|ROAD|LANE))$/;
const GENERIC_AREAS = 4;
/** A sale naming no town joins a generic street's dominant town at this share. */
const DOMINANT_SHARE = 0.8;
/** A second place splits a generic street when it has this many sales… */
const MIN_PLACE_SALES = 3;
/** …and at least this share of the top place's. */
const MIN_PLACE_SHARE = 0.25;

const isDistrict = (areaKey: string) => /^d\d/.test(areaKey);
const districtLabel = (areaKey: string) => `Dublin ${areaKey.slice(1).toUpperCase()}`;

/** The town or estate nearest the street in the address, other than its area (or its town and county). */
function nearestPlace(address: string, areaKey: string, county: string | null): { key: string; label: string } | null {
  const place = townsOf(address, county).find((a) => a.key !== areaKey && !areaKey.startsWith(`${a.key}-`));
  return place ? { key: place.key, label: displayStreetName(place.label) } : null;
}

/**
 * Streets for a batch of addresses (the whole register, in the pipeline).
 *
 * - The register often leaves out the postal district ("12 Butterfield
 *   Avenue, Rathfarnham"); such a sale joins the district street when other
 *   sales on the same street and town name the district.
 * - A generic name ("Main Street") is several streets in one district, so it
 *   is split by the nearest town or estate in the address. A sale naming none
 *   joins the dominant one, or no street when that is unclear.
 */
export function assignStreets(addresses: string[], county?: string | null): Array<StreetAssignment | null> {
  const outside = countySlug(county);
  const ids: Array<StreetIdentity | null> = addresses.map((a) => streetIdentity(a, county));

  // (street, town) -> district votes, from addresses that state both
  const votes = new Map<string, Map<string, number>>();
  addresses.forEach((address, i) => {
    const id = ids[i];
    if (!id || !isDistrict(id.areaKey)) return;
    for (const town of extractAreas(address).filter((a) => !isDistrict(a.key))) {
      const k = `${id.streetKey}|${town.key}`;
      const v = votes.get(k) ?? new Map<string, number>();
      v.set(id.areaKey, (v.get(id.areaKey) ?? 0) + 1);
      votes.set(k, v);
    }
  });
  ids.forEach((id, i) => {
    if (!id || isDistrict(id.areaKey)) return;
    const v = votes.get(`${id.streetKey}|${id.areaKey}`);
    if (!v) return;
    const [district] = [...v.entries()].sort((a, b) => b[1] - a[1])[0];
    ids[i] = { ...id, areaKey: district, areaLabel: districtLabel(district), slug: streetSlug(id.streetKey, district) };
  });

  // Generic names: how many areas each street name appears in
  const areasOf = new Map<string, Set<string>>();
  for (const id of ids) {
    if (!id) continue;
    const set = areasOf.get(id.streetKey) ?? new Set<string>();
    set.add(id.areaKey);
    areasOf.set(id.streetKey, set);
  }
  const generic = (id: StreetIdentity) =>
    GENERIC_NAME.test(id.streetKey) && (areasOf.get(id.streetKey)?.size ?? 0) >= GENERIC_AREAS;

  // (street, area) -> nearest-place votes, for generic names
  const places = new Map<string, Map<string, { label: string; n: number }>>();
  const nearest: Array<{ key: string; label: string } | null> = ids.map((id, i) => {
    if (!id || !generic(id)) return null;
    const place = nearestPlace(addresses[i], id.areaKey, outside);
    if (!place) return null;
    const k = `${id.streetKey}|${id.areaKey}`;
    const v = places.get(k) ?? new Map<string, { label: string; n: number }>();
    const entry = v.get(place.key) ?? { label: place.label, n: 0 };
    entry.n++;
    v.set(place.key, entry);
    places.set(k, v);
    return place;
  });

  // Split only where the addresses really name two or more places
  const divided = (k: string) => {
    const counts = [...(places.get(k)?.values() ?? [])].map((e) => e.n).sort((a, b) => b - a);
    return counts.length >= 2 && counts[1] >= Math.max(MIN_PLACE_SALES, counts[0] * MIN_PLACE_SHARE);
  };

  return ids.map((id, i) => {
    if (!id || !generic(id) || !divided(`${id.streetKey}|${id.areaKey}`)) return id;
    let place = nearest[i];
    if (!place) {
      const v = places.get(`${id.streetKey}|${id.areaKey}`);
      if (v) {
        const total = [...v.values()].reduce((sum, e) => sum + e.n, 0);
        const [key, top] = [...v.entries()].sort((a, b) => b[1].n - a[1].n)[0];
        if (top.n / total < DOMINANT_SHARE) return null;
        place = { key, label: top.label };
      }
    }
    if (!place) return id;
    const areaLabel = `${place.label}, ${id.areaLabel}`;
    const slug = streetSlug(id.streetKey, id.areaKey).replace(
      new RegExp(`-${areaSlugOf(id.areaKey)}$`),
      `-${place.key}-${areaSlugOf(id.areaKey)}`
    );
    return { ...id, areaLabel, slug };
  });
}

const UNIT_ADDRESS = /\b(?:apt|apts|apartment|apartments|unit|flat|block)\b/i;

/**
 * A register entry that is several homes sold together (a block of flats in
 * one transaction), judged against the street's median price: over 4x for a
 * flat or unit, over 8x for anything else. Left out of street figures.
 */
export function isBulkSale(address: string, price: number, streetMedian: number): boolean {
  if (!streetMedian) return false;
  const ratio = price / streetMedian;
  return ratio > 8 || (ratio > 4 && UNIT_ADDRESS.test(address));
}
