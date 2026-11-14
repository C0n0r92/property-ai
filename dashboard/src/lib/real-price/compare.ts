/**
 * Two homes side by side: what each will likely cost once the bidding is
 * done, and whether that changes which is the cheaper one.
 */
import type { TypeGroup } from './model';

export interface CompareHome {
  areaKey: string;
  typeGroup: TypeGroup;
  beds: number;
  askingPrice: number;
}

export interface CompareResult {
  label: string;
  asking: number;
  /** Likely sale price (the middle of similar sales) */
  mid: number;
  likelyLow: number;
  medianOverAskingPct: number;
  shareAbove: number;
  count: number;
}

const TYPES: TypeGroup[] = ['apartment', 'terraced', 'semi', 'detached'];
const SHORT: Record<TypeGroup, string> = { apartment: 'apt', terraced: 'terr', semi: 'semi', detached: 'det' };

/** "d8.terr.3.450000" for the page address, so a comparison can be shared. */
export function encodeHome(home: CompareHome): string {
  return [home.areaKey, SHORT[home.typeGroup], home.beds, Math.round(home.askingPrice)].join('.');
}

export function decodeHome(value: string | null | undefined): CompareHome | null {
  if (!value) return null;
  const [areaKey, type, beds, asking] = value.split('.');
  const typeGroup = TYPES.find((t) => SHORT[t] === type);
  const b = Number(beds);
  const a = Number(asking);
  if (!areaKey || !/^[a-z0-9-]{2,60}$/.test(areaKey) || !typeGroup) return null;
  if (!Number.isInteger(b) || b < 1 || b > 8) return null;
  if (!Number.isFinite(a) || a < 50_000 || a > 20_000_000) return null;
  return { areaKey, typeGroup, beds: b, askingPrice: Math.round(a) };
}

const euro = (v: number) => `€${Math.round(v).toLocaleString('en-IE')}`;

/** Gaps under this are "about the same" (likely prices are rounded and uncertain). */
const SAME = 10_000;

/**
 * The comparison in a sentence or two, led by what changes: the likely
 * prices against the asking prices.
 */
export function verdict(a: CompareResult, b: CompareResult, names: [string, string] = ['Home A', 'Home B']): string[] {
  const [nameA, nameB] = names;
  const askGap = b.asking - a.asking;
  const likelyGap = b.mid - a.mid;
  const lines: string[] = [];

  const cheaperAsking = askGap > 0 ? nameA : askGap < 0 ? nameB : null;
  const cheaperLikely = Math.abs(likelyGap) < SAME ? null : likelyGap > 0 ? nameA : nameB;

  if (cheaperAsking && cheaperLikely && cheaperAsking !== cheaperLikely) {
    lines.push(
      `${cheaperAsking} asks less, but ${cheaperLikely} will likely cost less: about ${euro(Math.abs(likelyGap))} less once the bidding is done.`
    );
  } else if (cheaperLikely) {
    const other = cheaperLikely === nameA ? nameB : nameA;
    lines.push(`${other} will likely cost about ${euro(Math.abs(likelyGap))} more than ${cheaperLikely}.`);
  } else {
    lines.push(`Once the bidding is done, the two will likely cost about the same (within ${euro(SAME)}).`);
  }

  const overA = a.mid - a.asking;
  const overB = b.mid - b.asking;
  const hotter = a.medianOverAskingPct - b.medianOverAskingPct;
  if (Math.abs(hotter) >= 2) {
    const [hot, cool, hotOver] = hotter > 0 ? [nameA, nameB, overA] : [nameB, nameA, overB];
    lines.push(
      `Homes like ${hot} bid harder: expect to pay around ${euro(Math.max(0, hotOver))} over its asking price, against less for ${cool}.`
    );
  } else {
    lines.push('Homes like these two bid about as hard as each other.');
  }
  return lines;
}
