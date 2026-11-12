/**
 * Real Price model
 *
 * Turns an asking price into the price a home is likely to sell for, using the
 * sold-vs-asking ratios of comparable recent sales. Pure functions only: no
 * file or network access, so the same code runs in the API, tests and backtest.
 */

export type TypeGroup = 'apartment' | 'terraced' | 'semi' | 'detached';

export type Tier =
  | 'area-type-size'
  | 'area-type'
  | 'area'
  | 'area-2y'
  | 'dublin-type'
  | 'none';

export interface Area {
  key: string;
  label: string;
}

export interface Sale {
  address: string;
  soldDate: string; // YYYY-MM-DD
  t: number; // soldDate as epoch ms
  askingPrice: number;
  soldPrice: number;
  ratio: number; // soldPrice / askingPrice
  beds: number | null;
  typeGroup: TypeGroup | null;
  areaKeys: string[];
  /** Floor area in square metres, when known. */
  sqm?: number | null;
}

export interface RawSale {
  address?: string | null;
  soldDate?: string | null;
  soldPrice?: number | null;
  askingPrice?: number | null;
  beds?: number | null;
  propertyType?: string | null;
  dublinPostcode?: string | null;
  areaSqm?: number | null;
}

export interface Query {
  areaKey: string;
  typeGroup: TypeGroup;
  beds?: number;
  askingPrice: number;
  budget?: number;
}

export interface Prediction {
  low: number; // 1 in 10 comparable sales closed below this
  likelyLow: number;
  mid: number;
  likelyHigh: number;
  high: number; // 1 in 10 comparable sales closed above this
  medianOverAskingPct: number;
  shareAboveAsking: number;
}

export interface BidRung {
  bid: number;
  overAskingPct: number;
  chance: number;
}

export interface ComparableSale {
  address: string;
  soldDate: string;
  askingPrice: number;
  soldPrice: number;
  overAskingPct: number;
}

export interface BudgetResult {
  amount: number;
  chance: number;
  evenOddsAsking: number;
  safeAsking: number;
}

export interface RealPriceResult {
  tier: Exclude<Tier, 'none'>;
  prediction: Prediction;
  bidLadder: BidRung[];
  evidence: {
    count: number;
    from: string;
    to: string;
    recent: ComparableSale[];
  };
  /** Over-asking % of the comparable sales, for the dot plot. */
  dots: { values: number[]; salesPerDot: number };
  budget?: BudgetResult;
}

export const MIN_COMPARABLES = 25;

const DAY_MS = 86_400_000;
const EARLIEST_SALE = Date.parse('2015-01-01');
const MIN_PRICE = 50_000;
const MIN_RATIO = 0.6;
const MAX_RATIO = 1.8;
const EPSILON = 1e-9;

const EIRCODE = /\b(?:[A-Z]\d{2}|D6W)\s?[A-Z0-9]{4}\b/gi;
const DISTRICT = /^dublin\s*(\d{1,2}w?)$/i;
const GENERIC = /^(?:co\.?|county)?\s*dublin$|^ireland$/i;
const STREET_SUFFIX =
  /\b(?:road|rd|street|st|avenue|ave|drive|dr|lane|ln|court|ct|grove|close|crescent|cres|terrace|square|sq|place|way|gardens|park|lawn|lawns|walk|row|rise|view|heights|mews)\.?$/i;

export function toTypeGroup(raw: string | null | undefined): TypeGroup | null {
  const t = (raw ?? '').trim().toLowerCase();
  if (t === 'terrace' || t === 'end of terrace' || t === 'townhouse') return 'terraced';
  if (t === 'semi-d') return 'semi';
  if (t === 'detached' || t === 'bungalow') return 'detached';
  if (t === 'apartment' || t === 'duplex') return 'apartment';
  return null;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function districtArea(code: string): Area {
  const c = code.toUpperCase();
  return { key: `d${c.toLowerCase()}`, label: `Dublin ${c}` };
}

/**
 * Areas a sale belongs to: its postal district (if any) followed by the named
 * localities in its address. The street part and county parts are ignored.
 */
export function extractAreas(address: string, dublinPostcode?: string | null): Area[] {
  const parts = address
    .split(',')
    .map((p) => p.replace(EIRCODE, '').trim())
    .filter(Boolean);

  let district: Area | null = null;
  const fromField = (dublinPostcode ?? '').trim().match(/^d(\d{1,2}w?)$/i);
  if (fromField) district = districtArea(fromField[1]);

  const localities: Area[] = [];
  // Skip the first part: it is the house number and street
  for (const part of parts.slice(1)) {
    const districtMatch = part.match(DISTRICT);
    if (districtMatch) {
      district ??= districtArea(districtMatch[1]);
      continue;
    }
    if (GENERIC.test(part) || /^\d/.test(part)) continue;

    // "Clondalkin 22" and "Rialto Dublin 8" -> "Clondalkin" and "Rialto"
    const name = part.replace(/(?:\s+dublin)?(?:\s+\d{1,2}w?)?$/i, '').trim();
    if (!name || STREET_SUFFIX.test(name)) continue;

    const key = slugify(name);
    if (key && !localities.some((l) => l.key === key)) {
      localities.push({ key, label: name });
    }
  }

  return district ? [district, ...localities] : localities;
}

/** Shorten a scraped address for display by dropping its repeated parts. */
export function tidyAddress(address: string): string {
  const parts = address
    .split(',')
    .map((p) => p.replace(EIRCODE, '').trim())
    .filter(Boolean);
  const hasDistrict = parts.some((p) => /dublin\s*\d{1,2}w?$/i.test(p));

  const kept: string[] = [];
  for (const part of parts) {
    const isDistrict = DISTRICT.test(part);
    if (GENERIC.test(part) && hasDistrict) continue;
    // "Rialto Dublin 8" -> "Rialto": the district follows as its own part
    const text = isDistrict ? part : part.replace(/\s+dublin\s*\d{1,2}w?$/i, '').trim();
    if (text && !kept.some((k) => k.toLowerCase() === text.toLowerCase())) kept.push(text);
  }
  return kept.join(', ');
}

/**
 * Validate and normalise a scraped sale. Returns null for records that cannot
 * be trusted: impossible dates, missing prices, or sold/asking ratios that
 * point to a data error.
 */
export function cleanSale(raw: RawSale, now: number): Sale | null {
  const { address, soldDate, soldPrice, askingPrice } = raw;
  if (!address || !soldDate || !soldPrice || !askingPrice) return null;
  if (/site/i.test(raw.propertyType ?? '')) return null;

  const t = Date.parse(soldDate);
  if (!Number.isFinite(t) || t < EARLIEST_SALE || t > now) return null;

  if (soldPrice < MIN_PRICE || askingPrice < MIN_PRICE) return null;
  const ratio = soldPrice / askingPrice;
  if (ratio < MIN_RATIO || ratio > MAX_RATIO) return null;

  return {
    address,
    soldDate: new Date(t).toISOString().slice(0, 10),
    t,
    askingPrice,
    soldPrice,
    ratio,
    beds: typeof raw.beds === 'number' && raw.beds > 0 ? raw.beds : null,
    typeGroup: toTypeGroup(raw.propertyType),
    areaKeys: extractAreas(address, raw.dublinPostcode).map((a) => a.key),
    sqm: typeof raw.areaSqm === 'number' && raw.areaSqm >= 20 && raw.areaSqm <= 1000 ? raw.areaSqm : null,
  };
}

/** Quantile of an ascending-sorted list, with linear interpolation. */
export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) throw new Error('quantile of empty list');
  const pos = (sorted.length - 1) * Math.min(1, Math.max(0, q));
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function sortedRatios(comps: Sale[]): number[] {
  return comps.map((c) => c.ratio).sort((a, b) => a - b);
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Pick the most specific set of recent sales that still has enough evidence,
 * widening step by step. `asOf` is the date of the newest sale in the data, so
 * windows are measured from the data, not from today.
 */
export function selectComparables(
  sales: Sale[],
  query: Query,
  asOf: number
): { comps: Sale[]; tier: Tier } {
  const oneYear = asOf - 365 * DAY_MS;
  const twoYears = asOf - 730 * DAY_MS;

  const recent = sales.filter((s) => s.t >= twoYears && s.t <= asOf);
  const inArea = recent.filter((s) => s.areaKeys.includes(query.areaKey));
  const inAreaYear = inArea.filter((s) => s.t >= oneYear);
  const sameType = (s: Sale) => s.typeGroup === query.typeGroup;
  const similarSize = (s: Sale) =>
    s.askingPrice >= query.askingPrice * 0.7 &&
    s.askingPrice <= query.askingPrice * 1.4 &&
    (query.beds === undefined || (s.beds !== null && Math.abs(s.beds - query.beds) <= 1));

  const tiers: Array<[Tier, () => Sale[]]> = [
    ['area-type-size', () => inAreaYear.filter((s) => sameType(s) && similarSize(s))],
    ['area-type', () => inAreaYear.filter(sameType)],
    ['area', () => inAreaYear],
    ['area-2y', () => inArea],
    ['dublin-type', () => recent.filter((s) => s.t >= oneYear && sameType(s))],
  ];

  for (const [tier, pick] of tiers) {
    const comps = pick();
    if (comps.length >= MIN_COMPARABLES) return { comps, tier };
  }
  return { comps: [], tier: 'none' };
}

export function predict(comps: Sale[], askingPrice: number): Prediction {
  const ratios = sortedRatios(comps);
  const price = (q: number) => roundTo(askingPrice * quantile(ratios, q), 1000);
  return {
    low: price(0.1),
    likelyLow: price(0.25),
    mid: price(0.5),
    likelyHigh: price(0.75),
    high: price(0.9),
    medianOverAskingPct: (quantile(ratios, 0.5) - 1) * 100,
    shareAboveAsking: ratios.filter((r) => r > 1 + EPSILON).length / ratios.length,
  };
}

/**
 * Share of comparable sales that closed at or below this bid, relative to
 * their own asking prices. Read it as "a bid this far over asking would have
 * been enough in X% of similar sales".
 */
export function winChance(comps: Sale[], askingPrice: number, bid: number): number {
  const target = bid / askingPrice + EPSILON;
  return comps.filter((c) => c.ratio <= target).length / comps.length;
}

/**
 * Highest asking price worth chasing with a fixed budget, such that the budget
 * would have covered `confidence` of comparable sales.
 */
export function maxAskingForBudget(comps: Sale[], budget: number, confidence: number): number {
  return roundTo(budget / quantile(sortedRatios(comps), confidence), 1000);
}

function buildBidLadder(comps: Sale[], askingPrice: number): BidRung[] {
  const ladder: BidRung[] = [];
  for (let step = 0; step <= 16; step++) {
    const overAskingPct = step * 2.5;
    const bid = roundTo(askingPrice * (1 + overAskingPct / 100), 1000);
    const chance = winChance(comps, askingPrice, bid);
    ladder.push({ bid, overAskingPct, chance });
    if (chance >= 0.95) break;
  }
  return ladder;
}

/**
 * Over-asking percentages for a dot plot. Large sets are thinned evenly through
 * the sorted values so the picture keeps its shape.
 */
export function sampleOverAsking(
  comps: Sale[],
  maxDots: number
): { values: number[]; salesPerDot: number } {
  const all = sortedRatios(comps).map((r) => Math.round((r - 1) * 1000) / 10);
  if (all.length <= maxDots) return { values: all, salesPerDot: 1 };
  const values = Array.from(
    { length: maxDots },
    (_, i) => all[Math.floor(((i + 0.5) * all.length) / maxDots)]
  );
  return { values, salesPerDot: Math.round(all.length / maxDots) };
}

export interface QuarterSummary {
  quarter: string; // "2025 Q1"
  count: number;
  medianOverAskingPct: number;
  medianPrice: number;
}

/** Quarter-by-quarter picture of an area, skipping quarters with too few sales. */
export function quarterlyTrend(
  sales: Sale[],
  areaKey: string,
  asOf: number,
  minPerQuarter = 8,
  typeGroup: TypeGroup | null = null
): QuarterSummary[] {
  const from = asOf - 3 * 365 * DAY_MS;
  const groups = new Map<string, Sale[]>();
  for (const sale of sales) {
    if (sale.t < from || sale.t > asOf || !sale.areaKeys.includes(areaKey)) continue;
    if (typeGroup && sale.typeGroup !== typeGroup) continue;
    const month = Number(sale.soldDate.slice(5, 7));
    const quarter = `${sale.soldDate.slice(0, 4)} Q${Math.ceil(month / 3)}`;
    const group = groups.get(quarter) ?? [];
    group.push(sale);
    groups.set(quarter, group);
  }
  return [...groups.entries()]
    .filter(([, group]) => group.length >= minPerQuarter)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([quarter, group]) => ({
      quarter,
      count: group.length,
      medianOverAskingPct: (quantile(sortedRatios(group), 0.5) - 1) * 100,
      medianPrice: quantile(group.map((g) => g.soldPrice).sort((a, b) => a - b), 0.5),
    }));
}

export function analyse(
  sales: Sale[],
  query: Query,
  asOf: number,
  recentLimit = 5
): RealPriceResult | null {
  const { comps, tier } = selectComparables(sales, query, asOf);
  if (tier === 'none') return null;

  const byDate = [...comps].sort((a, b) => b.t - a.t);
  const result: RealPriceResult = {
    tier,
    prediction: predict(comps, query.askingPrice),
    bidLadder: buildBidLadder(comps, query.askingPrice),
    dots: sampleOverAsking(comps, 300),
    evidence: {
      count: comps.length,
      from: byDate[byDate.length - 1].soldDate,
      to: byDate[0].soldDate,
      recent: byDate.slice(0, recentLimit).map((c) => ({
        address: tidyAddress(c.address),
        soldDate: c.soldDate,
        askingPrice: c.askingPrice,
        soldPrice: c.soldPrice,
        overAskingPct: (c.ratio - 1) * 100,
      })),
    },
  };

  if (query.budget !== undefined) {
    result.budget = {
      amount: query.budget,
      chance: winChance(comps, query.askingPrice, query.budget),
      evenOddsAsking: maxAskingForBudget(comps, query.budget, 0.5),
      safeAsking: maxAskingForBudget(comps, query.budget, 0.75),
    };
  }

  return result;
}

export interface AreaProfile {
  count: number;
  medianOverAskingPct: number;
  p25OverAskingPct: number;
  p75OverAskingPct: number;
  shareAboveAsking: number;
  medianPrice: number;
  medianPricePerSqm: number | null;
  trend: QuarterSummary[];
}

export const MIN_PROFILE_SALES = 20;

/**
 * How an area bids: the last year of sales (optionally one home type), plus
 * a quarter-by-quarter trend over three years.
 */
export function areaProfile(
  sales: Sale[],
  areaKey: string,
  typeGroup: TypeGroup | null,
  asOf: number
): AreaProfile | null {
  const from = asOf - 365 * DAY_MS;
  const recent = sales.filter(
    (s) =>
      s.t >= from &&
      s.t <= asOf &&
      s.areaKeys.includes(areaKey) &&
      (!typeGroup || s.typeGroup === typeGroup)
  );
  if (recent.length < MIN_PROFILE_SALES) return null;

  const ratios = sortedRatios(recent);
  const prices = recent.map((s) => s.soldPrice).sort((a, b) => a - b);
  const perSqm = recent
    .filter((s) => s.sqm)
    .map((s) => s.soldPrice / s.sqm!)
    .sort((a, b) => a - b);

  return {
    count: recent.length,
    medianOverAskingPct: (quantile(ratios, 0.5) - 1) * 100,
    p25OverAskingPct: (quantile(ratios, 0.25) - 1) * 100,
    p75OverAskingPct: (quantile(ratios, 0.75) - 1) * 100,
    shareAboveAsking: ratios.filter((r) => r > 1 + EPSILON).length / ratios.length,
    medianPrice: roundTo(quantile(prices, 0.5), 1000),
    // Too few floor areas makes this figure unreliable
    medianPricePerSqm: perSqm.length >= 10 ? roundTo(quantile(perSqm, 0.5), 100) : null,
    trend: quarterlyTrend(sales, areaKey, asOf, 6, typeGroup).slice(-10),
  };
}
