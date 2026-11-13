/**
 * Address normalisation for matching the same home across sources (the
 * Property Price Register, listing sites and our older records), which all
 * write addresses differently.
 */

const EIRCODE = /\b(?:[AC-FHKNPRTV-Y]\d{2}|D6W)\s?[0-9AC-FHKNPRTV-Y]{4}\b/gi;

const WORDS: Record<string, string> = {
  ROAD: 'RD',
  STREET: 'ST',
  SAINT: 'ST',
  AVENUE: 'AVE',
  DRIVE: 'DR',
  PARK: 'PK',
  COURT: 'CT',
  TERRACE: 'TCE',
  SQUARE: 'SQ',
  PLACE: 'PL',
  GROVE: 'GR',
  CRESCENT: 'CRES',
  GARDENS: 'GDNS',
  LANE: 'LN',
  CLOSE: 'CL',
  HEIGHTS: 'HTS',
  APARTMENT: 'APT',
  APARTMENTS: 'APTS',
  UPPER: 'UPR',
  LOWER: 'LWR',
  NORTH: 'N',
  SOUTH: 'S',
  EAST: 'E',
  WEST: 'W',
};

const GENERIC = new Set(['DUBLIN', 'CO DUBLIN', 'COUNTY DUBLIN', 'IRELAND', '']);

function clean(part: string): string {
  return part
    .toUpperCase()
    .replace(/['’`]/g, '')
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parts(address: string): string[] {
  return address.replace(EIRCODE, '').split(',').map(clean).filter(Boolean);
}

function districtOf(cleaned: string[]): string | null {
  for (const part of cleaned) {
    const match = part.match(/\bDUBLIN ?(\d{1,2}W?)$/);
    if (match) return `d${match[1].toLowerCase()}`;
  }
  return null;
}

export interface AddressKey {
  /** Normalised house number and street, e.g. "12B CHAMBER ST". */
  key: string;
  /** Postal district such as "d8", when the address states one. */
  district: string | null;
  /** False when there is no house number, so the key could be many homes. */
  specific: boolean;
}

export function addressKey(address: string): AddressKey {
  const cleaned = parts(address);
  let first = cleaned[0] ?? '';
  // "Apartment 40" and "No 7" on their own belong with the next part
  if (/^(?:APARTMENT|APT|UNIT|FLAT|NO)? ?\d+[A-Z]?$/.test(first) && cleaned[1] && !/^DUBLIN/.test(cleaned[1])) {
    first = `${first} ${cleaned[1]}`;
  }
  const key = first
    .split(' ')
    .filter((token) => token !== 'NO')
    .map((token) => WORDS[token] ?? token)
    .join(' ');
  return { key, district: districtOf(cleaned), specific: /\d/.test(key) };
}

function localities(address: string): Set<string> {
  const names = new Set<string>();
  for (const part of parts(address).slice(1)) {
    const name = part.replace(/\bDUBLIN ?\d{1,2}W?$/, '').replace(/ \d{1,2}W?$/, '').trim();
    if (!GENERIC.has(name)) names.add(name);
  }
  return names;
}

/** Do two addresses agree on where they are? */
export function sameArea(a: string, b: string): boolean {
  const districtA = addressKey(a).district;
  const districtB = addressKey(b).district;
  if (districtA && districtB) return districtA === districtB;
  const namesB = localities(b);
  for (const name of localities(a)) if (namesB.has(name)) return true;
  return false;
}
