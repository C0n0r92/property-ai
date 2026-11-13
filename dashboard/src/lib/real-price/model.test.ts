import { describe, expect, it } from 'vitest';
import {
  analyse,
  cleanSale,
  extractAreas,
  maxAskingForBudget,
  predict,
  quantile,
  quarterlyTrend,
  areaProfile,
  sampleOverAsking,
  selectComparables,
  tidyAddress,
  toTypeGroup,
  typicalAsking,
  winChance,
  type Sale,
} from './model';

const DAY = 86_400_000;
const AS_OF = Date.parse('2025-12-31');

function sale(overrides: Partial<Sale> = {}): Sale {
  const askingPrice = overrides.askingPrice ?? 400_000;
  const ratio = overrides.ratio ?? 1.05;
  return {
    address: '1 Test Road, Kilmainham, Dublin 8',
    soldDate: '2025-06-01',
    t: Date.parse('2025-06-01'),
    askingPrice,
    soldPrice: Math.round(askingPrice * ratio),
    ratio,
    beds: 3,
    typeGroup: 'terraced',
    areaKeys: ['d8', 'kilmainham'],
    ...overrides,
  };
}

/** n sales whose ratios are spread evenly between lo and hi. */
function spread(n: number, lo: number, hi: number, overrides: Partial<Sale> = {}): Sale[] {
  return Array.from({ length: n }, (_, i) =>
    sale({ ratio: lo + ((hi - lo) * i) / (n - 1), ...overrides })
  );
}

describe('toTypeGroup', () => {
  it('maps scraped property types onto four groups', () => {
    expect(toTypeGroup('Terrace')).toBe('terraced');
    expect(toTypeGroup('End of Terrace')).toBe('terraced');
    expect(toTypeGroup('Townhouse')).toBe('terraced');
    expect(toTypeGroup('Semi-D')).toBe('semi');
    expect(toTypeGroup('Detached')).toBe('detached');
    expect(toTypeGroup('Bungalow')).toBe('detached');
    expect(toTypeGroup('Apartment')).toBe('apartment');
    expect(toTypeGroup('Duplex')).toBe('apartment');
    expect(toTypeGroup('terrace')).toBe('terraced');
  });

  it('understands listing-site type names', () => {
    expect(toTypeGroup('Semi-Detached House')).toBe('semi');
    expect(toTypeGroup('Terraced House')).toBe('terraced');
    expect(toTypeGroup('End of Terrace House')).toBe('terraced');
    expect(toTypeGroup('Detached House')).toBe('detached');
    expect(toTypeGroup('Studio')).toBe('apartment');
    expect(toTypeGroup('House')).toBeNull();
  });

  it('returns null for sites and unknown types', () => {
    expect(toTypeGroup('Site')).toBeNull();
    expect(toTypeGroup('')).toBeNull();
    expect(toTypeGroup(undefined)).toBeNull();
  });
});

describe('extractAreas', () => {
  it('finds the postal district and named localities', () => {
    const areas = extractAreas('7 Auburn Dr, Castleknock, Dublin 15, Dublin 15, Dublin', 'D15');
    expect(areas).toEqual([
      { key: 'd15', label: 'Dublin 15' },
      { key: 'castleknock', label: 'Castleknock' },
    ]);
  });

  it('reads the district from the address when the postcode field is missing', () => {
    const areas = extractAreas('3 Main St, Terenure, Dublin 6W', null);
    expect(areas.map((a) => a.key)).toEqual(['d6w', 'terenure']);
    expect(areas[0].label).toBe('Dublin 6W');
  });

  it('handles county addresses with no postal district', () => {
    const areas = extractAreas('89 Springhill Ave, Deans Grange, Blackrock, Dublin', null);
    expect(areas.map((a) => a.key)).toEqual(['deans-grange', 'blackrock']);
  });

  it('strips district numbers and eircodes from locality names', () => {
    const areas = extractAreas(
      '87 St Johns Crescent, Clondalkin 22, Dublin 22, Dublin 22, Dublin, D22 X2Y3',
      'D22'
    );
    expect(areas.map((a) => a.key)).toEqual(['d22', 'clondalkin']);
  });

  it('merges "Rialto Dublin 8" style parts into the plain locality', () => {
    const areas = extractAreas('26 Reuben Ave, Rialto Dublin 8, Dublin 8, Dublin', 'D8');
    expect(areas).toEqual([
      { key: 'd8', label: 'Dublin 8' },
      { key: 'rialto', label: 'Rialto' },
    ]);
  });

  it('ignores generic county parts and street-like parts', () => {
    const areas = extractAreas('17 Beechlawn, South Hill Ave, Blackrock, Co. Dublin', null);
    expect(areas.map((a) => a.key)).toEqual(['blackrock']);
  });
});

describe('tidyAddress', () => {
  it('removes repeated district and county parts', () => {
    expect(tidyAddress('12b Chamber St, Dublin 8, Dublin, Dublin 8, Dublin')).toBe(
      '12b Chamber St, Dublin 8'
    );
    expect(tidyAddress('26 Reuben Ave, Rialto Dublin 8, Dublin 8, Dublin')).toBe(
      '26 Reuben Ave, Rialto, Dublin 8'
    );
  });

  it('keeps the county when there is no postal district', () => {
    expect(tidyAddress('2 Belmont Grove, Stillorgan, Dublin, Dublin')).toBe(
      '2 Belmont Grove, Stillorgan, Dublin'
    );
  });
});

describe('cleanSale', () => {
  const raw = {
    address: '1 Test Road, Kilmainham, Dublin 8',
    soldDate: '2025-06-01',
    soldPrice: 420_000,
    askingPrice: 400_000,
    beds: 3,
    propertyType: 'Terrace',
    dublinPostcode: 'D8',
  };

  it('normalises a valid sale', () => {
    const s = cleanSale(raw, AS_OF);
    expect(s).not.toBeNull();
    expect(s!.ratio).toBeCloseTo(1.05);
    expect(s!.typeGroup).toBe('terraced');
    expect(s!.areaKeys).toEqual(['d8', 'kilmainham']);
  });

  it('rejects impossible dates', () => {
    expect(cleanSale({ ...raw, soldDate: '2032-05-07' }, AS_OF)).toBeNull();
    expect(cleanSale({ ...raw, soldDate: '1970-01-06' }, AS_OF)).toBeNull();
    expect(cleanSale({ ...raw, soldDate: 'not a date' }, AS_OF)).toBeNull();
  });

  it('rejects missing or implausible prices', () => {
    expect(cleanSale({ ...raw, askingPrice: 0 }, AS_OF)).toBeNull();
    expect(cleanSale({ ...raw, soldPrice: 20_000 }, AS_OF)).toBeNull();
    // Sold at 3x asking is a data error, not a bidding war
    expect(cleanSale({ ...raw, soldPrice: 1_200_000 }, AS_OF)).toBeNull();
    expect(cleanSale({ ...raw, soldPrice: 150_000 }, AS_OF)).toBeNull();
  });

  it('rejects sites', () => {
    expect(cleanSale({ ...raw, propertyType: 'Site' }, AS_OF)).toBeNull();
  });
});

describe('quantile', () => {
  it('interpolates between sorted values', () => {
    const v = [1, 2, 3, 4, 5];
    expect(quantile(v, 0)).toBe(1);
    expect(quantile(v, 0.5)).toBe(3);
    expect(quantile(v, 1)).toBe(5);
    expect(quantile(v, 0.125)).toBeCloseTo(1.5);
  });

  it('throws on an empty list', () => {
    expect(() => quantile([], 0.5)).toThrow();
  });
});

describe('selectComparables', () => {
  const query = { areaKey: 'd8', typeGroup: 'terraced' as const, beds: 3, askingPrice: 400_000 };

  it('uses the tightest tier when it has enough sales', () => {
    const sales = [
      ...spread(30, 1, 1.1),
      ...spread(30, 1, 1.1, { typeGroup: 'apartment' }),
      ...spread(30, 1, 1.1, { areaKeys: ['d15'] }),
    ];
    const { comps, tier } = selectComparables(sales, query, AS_OF);
    expect(tier).toBe('area-type-size');
    expect(comps).toHaveLength(30);
  });

  it('excludes sales with a very different asking price or bed count in the tightest tier', () => {
    const sales = [
      ...spread(30, 1, 1.1),
      ...spread(10, 1, 1.1, { askingPrice: 900_000 }),
      ...spread(10, 1, 1.1, { beds: 6 }),
    ];
    const { comps, tier } = selectComparables(sales, query, AS_OF);
    expect(tier).toBe('area-type-size');
    expect(comps).toHaveLength(30);
  });

  it('widens to the same type in the area when the tight tier is thin', () => {
    const sales = [...spread(10, 1, 1.1), ...spread(20, 1, 1.1, { askingPrice: 900_000 })];
    const { comps, tier } = selectComparables(sales, query, AS_OF);
    expect(tier).toBe('area-type');
    expect(comps).toHaveLength(30);
  });

  it('widens to all types in the area, then to two years', () => {
    const otherTypes = spread(30, 1, 1.1, { typeGroup: 'apartment' });
    expect(selectComparables(otherTypes, query, AS_OF).tier).toBe('area');

    const old = spread(30, 1, 1.1, {
      typeGroup: 'apartment',
      t: AS_OF - 500 * DAY,
      soldDate: '2024-08-18',
    });
    expect(selectComparables(old, query, AS_OF).tier).toBe('area-2y');
  });

  it('falls back to the same type across Dublin', () => {
    const elsewhere = spread(40, 1, 1.1, { areaKeys: ['d15'] });
    const { comps, tier } = selectComparables(elsewhere, query, AS_OF);
    expect(tier).toBe('dublin-type');
    expect(comps).toHaveLength(40);
  });

  it('ignores sales older than the window and returns none when nothing fits', () => {
    const ancient = spread(40, 1, 1.1, { t: AS_OF - 900 * DAY, soldDate: '2023-07-15' });
    const { comps, tier } = selectComparables(ancient, query, AS_OF);
    expect(tier).toBe('none');
    expect(comps).toHaveLength(0);
  });
});

describe('predict', () => {
  it('scales the comparable sold/asking ratios onto the asking price', () => {
    const comps = spread(101, 0.95, 1.15); // median ratio 1.05
    const p = predict(comps, 400_000);
    expect(p.mid).toBe(420_000);
    expect(p.low).toBe(388_000); // p10 = 0.97
    expect(p.high).toBe(452_000); // p90 = 1.13
    expect(p.likelyLow).toBe(400_000); // p25 = 1.00
    expect(p.likelyHigh).toBe(440_000); // p75 = 1.10
    expect(p.medianOverAskingPct).toBeCloseTo(5, 1);
  });

  it('reports the share of comparables that sold above asking', () => {
    const comps = [
      ...spread(25, 0.9, 0.99),
      ...spread(75, 1.01, 1.2),
    ];
    expect(predict(comps, 400_000).shareAboveAsking).toBeCloseTo(0.75);
  });
});

describe('winChance', () => {
  const comps = spread(101, 0.95, 1.15);

  it('is the share of comparable sales a bid would have matched or beaten', () => {
    expect(winChance(comps, 400_000, 420_000)).toBeCloseTo(0.5, 1);
    expect(winChance(comps, 400_000, 370_000)).toBe(0);
    expect(winChance(comps, 400_000, 460_000)).toBe(1);
  });

  it('never decreases as the bid rises', () => {
    let last = -1;
    for (let bid = 360_000; bid <= 480_000; bid += 5_000) {
      const c = winChance(comps, 400_000, bid);
      expect(c).toBeGreaterThanOrEqual(last);
      last = c;
    }
  });
});

describe('maxAskingForBudget', () => {
  it('returns the asking price a budget can realistically chase', () => {
    const comps = spread(101, 0.95, 1.15);
    // Half of comparable sales closed at or below 1.05x asking
    expect(maxAskingForBudget(comps, 420_000, 0.5)).toBe(400_000);
    // To cover 75% of outcomes you need to look at lower asking prices
    expect(maxAskingForBudget(comps, 440_000, 0.75)).toBe(400_000);
    expect(maxAskingForBudget(comps, 420_000, 0.75)).toBeLessThan(400_000);
  });
});

describe('analyse', () => {
  const query = { areaKey: 'd8', typeGroup: 'terraced' as const, beds: 3, askingPrice: 400_000 };

  it('returns null when there is not enough evidence', () => {
    expect(analyse(spread(5, 1, 1.1), query, AS_OF)).toBeNull();
  });

  it('returns a prediction, bid ladder and evidence summary', () => {
    const sales = spread(101, 0.95, 1.15).map((s, i) => {
      const t = AS_OF - i * DAY;
      return { ...s, t, soldDate: new Date(t).toISOString().slice(0, 10) };
    });
    const result = analyse(sales, query, AS_OF)!;

    expect(result.tier).toBe('area-type-size');
    expect(result.prediction.mid).toBe(420_000);
    expect(result.evidence.count).toBe(101);
    expect(result.evidence.to).toBe('2025-12-31');
    expect(result.evidence.from).toBe('2025-09-22');

    // Most recent comparable sales first
    expect(result.evidence.recent).toHaveLength(5);
    expect(result.evidence.recent[0].soldDate).toBe('2025-12-31');

    // Ladder runs from asking upwards with rising chances
    expect(result.bidLadder[0].bid).toBe(400_000);
    const chances = result.bidLadder.map((r) => r.chance);
    expect([...chances].sort((a, b) => a - b)).toEqual(chances);
    expect(chances[chances.length - 1]).toBeGreaterThanOrEqual(0.9);
  });

  it('applies a budget when one is given', () => {
    const sales = spread(101, 0.95, 1.15);
    const result = analyse(sales, { ...query, budget: 420_000 }, AS_OF)!;
    expect(result.budget).toEqual({
      amount: 420_000,
      chance: expect.closeTo(0.5, 1),
      evenOddsAsking: 400_000,
      safeAsking: expect.any(Number),
    });
    expect(result.budget!.safeAsking).toBeLessThan(400_000);
  });
});

describe('sampleOverAsking', () => {
  it('returns one sorted value per sale when there are few sales', () => {
    const sample = sampleOverAsking(spread(50, 0.95, 1.15), 300);
    expect(sample.salesPerDot).toBe(1);
    expect(sample.values).toHaveLength(50);
    expect(sample.values[0]).toBeCloseTo(-5, 1);
    expect(sample.values[49]).toBeCloseTo(15, 1);
    expect([...sample.values].sort((a, b) => a - b)).toEqual(sample.values);
  });

  it('thins a large set evenly and reports how many sales each dot stands for', () => {
    const sample = sampleOverAsking(spread(1200, 0.9, 1.3), 300);
    expect(sample.values).toHaveLength(300);
    expect(sample.salesPerDot).toBe(4);
    // The thinned sample keeps the same middle
    expect(sample.values[150]).toBeCloseTo(10, 0);
  });
});

describe('quarterlyTrend', () => {
  it('summarises an area by quarter and skips thin quarters', () => {
    const q1 = spread(10, 1.0, 1.1, { t: Date.parse('2025-02-10'), soldDate: '2025-02-10' });
    const q2 = spread(10, 1.1, 1.2, { t: Date.parse('2025-05-10'), soldDate: '2025-05-10' });
    const thin = spread(3, 1.0, 1.1, { t: Date.parse('2025-08-10'), soldDate: '2025-08-10' });
    const elsewhere = spread(10, 1.5, 1.6, {
      areaKeys: ['d15'],
      t: Date.parse('2025-02-10'),
      soldDate: '2025-02-10',
    });
    const trend = quarterlyTrend([...q1, ...q2, ...thin, ...elsewhere], 'd8', AS_OF);
    expect(trend.map((q) => q.quarter)).toEqual(['2025 Q1', '2025 Q2']);
    expect(trend[0].medianOverAskingPct).toBeCloseTo(5, 0);
    expect(trend[1].medianOverAskingPct).toBeCloseTo(15, 0);
    expect(trend[0].count).toBe(10);
    expect(trend[0].medianPrice).toBeGreaterThan(400_000);
  });
});

describe('analyse evidence limit', () => {
  it('returns as many recent sales as asked for', () => {
    const query = { areaKey: 'd8', typeGroup: 'terraced' as const, beds: 3, askingPrice: 400_000 };
    const result = analyse(spread(60, 0.95, 1.15), query, AS_OF, 40)!;
    expect(result.evidence.recent).toHaveLength(40);
  });
});

describe('cleanSale floor area', () => {
  it('keeps a plausible floor area and drops nonsense', () => {
    const raw = {
      address: '1 Test Road, Kilmainham, Dublin 8',
      soldDate: '2025-06-01',
      soldPrice: 420_000,
      askingPrice: 400_000,
      propertyType: 'Terrace',
      dublinPostcode: 'D8',
    };
    expect(cleanSale({ ...raw, areaSqm: 84 }, AS_OF)!.sqm).toBe(84);
    expect(cleanSale({ ...raw, areaSqm: 4 }, AS_OF)!.sqm).toBeNull();
    expect(cleanSale({ ...raw, areaSqm: 9000 }, AS_OF)!.sqm).toBeNull();
    expect(cleanSale(raw, AS_OF)!.sqm).toBeNull();
  });
});

describe('areaProfile', () => {
  const dated = (list: Sale[], iso: string) =>
    list.map((s) => ({ ...s, t: Date.parse(iso), soldDate: iso }));

  it('summarises the last year of sales in an area', () => {
    const sales = [
      ...dated(spread(30, 1.0, 1.2, { sqm: 100 }), '2025-06-01'),
      ...dated(spread(30, 1.5, 1.6, { areaKeys: ['d15'] }), '2025-06-01'),
    ];
    const profile = areaProfile(sales, 'd8', null, AS_OF)!;
    expect(profile.count).toBe(30);
    expect(profile.medianOverAskingPct).toBeCloseTo(10, 0);
    expect(profile.p25OverAskingPct).toBeCloseTo(5, 0);
    expect(profile.p75OverAskingPct).toBeCloseTo(15, 0);
    expect(profile.medianPrice).toBe(440_000);
    expect(profile.medianPricePerSqm).toBe(4_400);
    expect(profile.shareAboveAsking).toBeCloseTo(29 / 30, 2);
  });

  it('filters by home type and ignores sales older than a year for the summary', () => {
    const sales = [
      ...dated(spread(25, 1.0, 1.1), '2025-06-01'),
      ...dated(spread(25, 1.2, 1.3, { typeGroup: 'apartment' }), '2025-06-01'),
      ...dated(spread(25, 1.4, 1.5), '2024-06-01'),
    ];
    expect(areaProfile(sales, 'd8', 'terraced', AS_OF)!.count).toBe(25);
    expect(areaProfile(sales, 'd8', 'apartment', AS_OF)!.medianOverAskingPct).toBeCloseTo(25, 0);
    // The older sales still feed the quarterly trend
    const trend = areaProfile(sales, 'd8', 'terraced', AS_OF)!.trend;
    expect(trend.map((q) => q.quarter)).toEqual(['2024 Q2', '2025 Q2']);
  });

  it('returns null when an area has too few recent sales', () => {
    expect(areaProfile(spread(10, 1, 1.1), 'd8', null, AS_OF)).toBeNull();
  });

  it('leaves price per square metre empty when floor areas are missing', () => {
    expect(areaProfile(spread(30, 1, 1.1), 'd8', null, AS_OF)!.medianPricePerSqm).toBeNull();
  });
});

describe('typicalAsking', () => {
  const lucan = (beds: number, askingPrice: number, n: number, soldDate = '2025-06-01') =>
    Array.from({ length: n }, () =>
      sale({ beds, askingPrice, typeGroup: 'semi', areaKeys: ['lucan'], soldDate, t: Date.parse(soldDate) })
    );
  const sales = [...lucan(3, 425_000, 12), ...lucan(4, 539_000, 8), ...lucan(2, 380_000, 2)];
  const home = { areaKey: 'lucan', typeGroup: 'semi' as const };

  it('gives the middle asking price of homes with the same bedrooms, to the nearest 5,000', () => {
    expect(typicalAsking(sales, { ...home, beds: 3 }, AS_OF)).toBe(425_000);
    expect(typicalAsking(sales, { ...home, beds: 4 }, AS_OF)).toBe(540_000);
  });

  it('gives nothing when too few such homes sold', () => {
    expect(typicalAsking(sales, { ...home, beds: 2 }, AS_OF)).toBeNull();
    expect(typicalAsking(sales, { ...home, typeGroup: 'apartment', beds: 3 }, AS_OF)).toBeNull();
  });

  it('looks back two years when the last year is too thin', () => {
    const older = lucan(5, 700_000, 6, '2024-06-01');
    expect(typicalAsking(older, { ...home, beds: 5 }, AS_OF)).toBe(700_000);
  });
});
