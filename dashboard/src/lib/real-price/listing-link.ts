/**
 * Reading a pasted MyHome.ie or Daft.ie listing link. Both sites put the
 * home's address (and Daft its type) in the link, followed by the listing id:
 *
 *   myhome.ie/residential/brochure/3-butterfield-avenue-rathfarnham-dublin-14/5041236
 *   daft.ie/for-sale/semi-detached-house-53a-ashmount-court-kilmainham-dublin-8/6458297
 */
import { addressKey } from './address';
import type { TypeGroup } from './model';

export interface ListingLink {
  site: 'myhome' | 'daft';
  id: string;
  /** Rebuilt from the link: "53a Ashmount Court, Kilmainham, Dublin 8" */
  address: string;
  /** Normalised house number and street, as stored in listings.address_key */
  streetKey: string;
  district: string | null;
  /** Home type named in a Daft link */
  typeHint: TypeGroup | null;
}

/** Daft link prefixes, longest first, and the home type each names. */
const DAFT_TYPES: Array<[string, TypeGroup | null]> = [
  ['end-of-terrace-house', 'terraced'],
  ['semi-detached-house', 'semi'],
  ['detached-house', 'detached'],
  ['terraced-house', 'terraced'],
  ['townhouse', 'terraced'],
  ['bungalow', 'detached'],
  ['apartment', 'apartment'],
  ['penthouse', 'apartment'],
  ['duplex', 'apartment'],
  ['studio', 'apartment'],
  ['house', null],
  ['site', null],
];

/** Words that end the street part of an address. */
const STREET_END =
  /^(road|rd|street|st|avenue|ave|drive|dr|lane|court|grove|close|crescent|terrace|square|place|way|gardens|park|lawn|lawns|walk|row|rise|view|heights|mews|green|hill|wood|vale|quay|parade|manor|downs|glen|meadows|centre|hall|lodge)$/;

const title = (word: string) => (/^\d/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1));

/** "53a-ashmount-court-kilmainham-dublin-8" -> "53a Ashmount Court, Kilmainham, Dublin 8" */
function slugToAddress(slug: string): string {
  const words = slug.split('-').filter(Boolean);
  const parts: string[] = [];

  // County or postal district at the end
  let tail = '';
  const n = words.length;
  if (n >= 2 && words[n - 2] === 'dublin' && /^\d{1,2}w?$/.test(words[n - 1])) {
    tail = `Dublin ${words[n - 1].toUpperCase()}`;
    words.splice(n - 2, 2);
  } else if (n >= 2 && words[n - 2] === 'co' && words[n - 1] === 'dublin') {
    tail = 'Co Dublin';
    words.splice(n - 2, 2);
  } else if (words[n - 1] === 'dublin') {
    tail = 'Dublin';
    words.pop();
  }

  // House number and street up to the first street word, then the locality
  const streetEnd = words.findIndex((w, i) => i > 0 && STREET_END.test(w));
  if (streetEnd >= 0) {
    parts.push(words.slice(0, streetEnd + 1).map(title).join(' '));
    const rest = words.slice(streetEnd + 1);
    if (rest.length) parts.push(rest.map(title).join(' '));
  } else if (words.length) {
    parts.push(words.map(title).join(' '));
  }
  if (tail) parts.push(tail);
  return parts.join(', ');
}

export function parseListingLink(input: string): ListingLink | null {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean).map((s) => decodeURIComponent(s).toLowerCase());

  let site: ListingLink['site'];
  let slug: string;
  let id: string;
  let typeHint: TypeGroup | null = null;

  if (host === 'myhome.ie' && segments[0] === 'residential' && segments[1] === 'brochure' && segments.length >= 4) {
    site = 'myhome';
    [slug, id] = [segments[2], segments[3]];
  } else if (host === 'daft.ie' && segments[0] === 'for-sale' && segments.length >= 3) {
    site = 'daft';
    [slug, id] = [segments[1], segments[2]];
    for (const [prefix, type] of DAFT_TYPES) {
      if (slug.startsWith(`${prefix}-`)) {
        typeHint = type;
        slug = slug.slice(prefix.length + 1);
        // Daft repeats the type in some apartment addresses: "apartment-apartment-20-..."
        if (slug.startsWith(`${prefix}-`)) slug = slug.slice(prefix.length + 1);
        break;
      }
    }
  } else {
    return null;
  }
  if (!/^\d{4,12}$/.test(id) || !/^[a-z0-9-]+$/.test(slug)) return null;

  const address = slugToAddress(slug);
  const key = addressKey(address);
  return { site, id, address, streetKey: key.key, district: key.district, typeHint };
}
