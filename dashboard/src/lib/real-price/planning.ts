/**
 * Planning applications (the national planning applications database, all
 * four Dublin councils): what the work is, what was decided, and which home
 * and street it is on.
 *
 * Shared with the pipeline (pipeline/src/ingest-planning.ts), so it imports
 * only the other shared helpers.
 */
import { addressKey } from './address';
import { streetIdentity } from './streets';

export type Decision = 'granted' | 'part' | 'refused' | 'invalid' | 'withdrawn' | 'pending' | 'other';

/** The councils write decisions many ways, often cut short. */
export function decisionOf(raw: string | null | undefined): Decision {
  const d = (raw ?? '').trim().toUpperCase();
  if (!d || /ADDITIONAL INFORMATION|FURTHER INFORMATION|CLARIFICATION/.test(d)) return 'pending';
  if (/INVALID|INVA$/.test(d)) return 'invalid';
  if (/WITHDRAW/.test(d)) return 'withdrawn';
  if (/EXTENSION OF DURATION|EXEMPT/.test(d)) return 'other';
  const grant = /GRANT/.test(d);
  const refuse = /REFUS/.test(d);
  if (grant && refuse) return 'part';
  if (grant) return 'granted';
  if (refuse) return 'refused';
  return 'other';
}

const KINDS: Array<[string, RegExp]> = [
  ['extension', /\bextension|\bextend|\bconservatory|\bsun ?room|\bporch\b/i],
  ['attic', /\battic|\bdormer|\bloft\b|\bconversion of (the )?roof/i],
  ['new homes', /\b(?:dwellings?|houses|apartments|residential units|homes)\b.*\b(?:construct|erect|build)|\b(?:construct|erect|build)\w*\b.*\b(?:dwellings?|houses?|apartments|residential units|homes)\b/i],
  ['change of use', /\bchange of use\b/i],
  ['demolition', /\bdemoli/i],
  ['solar', /\bsolar|\bphotovoltaic|\bpv panels/i],
  ['driveway', /\bvehicular (?:access|entrance)|\bdishing of (?:the )?(?:kerb|footpath)|\bdriveway/i],
];

/** What the work is, from the description, in a fixed order. */
export function kindsOf(description: string | null | undefined): string[] {
  const text = description ?? '';
  return KINDS.filter(([, pattern]) => pattern.test(text)).map(([kind]) => kind);
}

const HOME = /^(?:(?:APT|UNIT|FLAT) \d+[A-Z]?(?: \d+[A-Z]?)? [A-Z]|\d+[A-Z]? [A-Z])/;

/** The home (house and street) and street page an application belongs to. */
export function planningSite(address: string): { homeKey: string | null; district: string | null; streetSlug: string | null } {
  // The register's addresses don't carry Eircodes or a second copy of the district; tidy to match
  const tidy = address.replace(/\s+/g, ' ').trim();
  const key = addressKey(tidy);
  return {
    // A home: starts with a house (or flat) number, and is a house and street, not a site description
    homeKey: HOME.test(key.key) && !/\bDUBLIN\b/.test(key.key) ? key.key : null,
    district: key.district,
    streetSlug: streetIdentity(tidy)?.slug ?? null,
  };
}
