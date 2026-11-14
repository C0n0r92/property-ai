import { describe, expect, it } from 'vitest';
import { bringForward, errorBands, estimateWorth, fitIndex, indexAt, repeatPairs, yearOf, type SalePoint } from './worth';

/** A market rising 10% a year from 2010: each home sells twice, a few years apart. */
function risingMarket(homes = 200, growth = 0.1): SalePoint[] {
  const sales: SalePoint[] = [];
  for (let h = 0; h < homes; h++) {
    const base = 200_000 + (h % 7) * 50_000;
    const t1 = 2010 + (h % 9) + 0.3;
    const t2 = t1 + 2 + (h % 5);
    sales.push({ home: `h${h}`, area: 'd8', t: t1, price: base * (1 + growth) ** (t1 - 2010) });
    sales.push({ home: `h${h}`, area: 'd8', t: t2, price: base * (1 + growth) ** (t2 - 2010) });
  }
  return sales;
}

describe('repeatPairs', () => {
  it('pairs consecutive sales of the same home', () => {
    const pairs = repeatPairs([
      { home: 'a', area: 'x', t: 2012, price: 200_000 },
      { home: 'a', area: 'x', t: 2018, price: 300_000 },
      { home: 'a', area: 'x', t: 2024, price: 420_000 },
      { home: 'b', area: 'x', t: 2015, price: 250_000 },
    ]);
    expect(pairs.map((p) => [p.t1, p.t2])).toEqual([
      [2012, 2018],
      [2018, 2024],
    ]);
  });

  it('drops quick resales and implausible jumps', () => {
    expect(
      repeatPairs([
        { home: 'a', area: 'x', t: 2020, price: 200_000 },
        { home: 'a', area: 'x', t: 2020.2, price: 230_000 },
        { home: 'b', area: 'x', t: 2015, price: 60_000 },
        { home: 'b', area: 'x', t: 2020, price: 900_000 },
      ])
    ).toEqual([]);
  });
});

describe('fitIndex', () => {
  it('recovers a steady 10% a year', () => {
    const index = fitIndex(repeatPairs(risingMarket()), 2010, 2024)!;
    expect(index.values[0]).toBe(1);
    // 2020 should be about 1.1^10 = 2.59 (smoothing pulls it a little)
    expect(indexAt(index, 2020)).toBeGreaterThan(2.4);
    expect(indexAt(index, 2020)).toBeLessThan(2.75);
    expect(bringForward(index, 300_000, 2015, 2016) / 300_000).toBeCloseTo(1.1, 1);
  });

  it('needs enough pairs', () => {
    expect(fitIndex(repeatPairs(risingMarket(5)), 2010, 2024)).toBeNull();
  });
});

describe('estimates and their accuracy', () => {
  const pairs = repeatPairs(risingMarket());
  const index = fitIndex(pairs, 2010, 2024)!;
  const bands = errorBands(index, pairs);

  it('a clean market predicts its own resales closely', () => {
    expect(bands.medianAbsPct).toBeLessThan(3);
    expect(bands.within10Pct).toBeGreaterThan(95);
  });

  it('an estimate brings the last sale to today, with a range around it', () => {
    const e = estimateWorth(index, bands, 300_000, 2018, 2022);
    expect(e.mid).toBeGreaterThan(400_000);
    expect(e.mid).toBeLessThan(470_000);
    expect(e.low).toBeLessThanOrEqual(e.mid);
    expect(e.high).toBeGreaterThanOrEqual(e.mid);
    expect(e.mid % 1000).toBe(0);
  });
});

describe('yearOf', () => {
  it('fractional years', () => {
    expect(yearOf('2020-01-01')).toBe(2020);
    expect(yearOf('2019-07-02')).toBeCloseTo(2019.5, 1);
  });
});

describe('helpers', async () => {
  const { blendWithStreet, indexArea, isHomeKey } = await import('./worth');
  it('home keys', () => {
    expect(isHomeKey('12 BUTTERFIELD AVE')).toBe(true);
    expect(isHomeKey('APT 4 12 MAIN ST')).toBe(true);
    expect(isHomeKey('ROSE COTTAGE')).toBe(false);
  });
  it('index areas', () => {
    expect(indexArea('Dublin', 'd8', 'rialto')).toBe('d8');
    expect(indexArea('Kildare', null, 'naas-kildare')).toBe('naas-kildare');
    expect(indexArea('Kerry', null, null)).toBe('county:Kerry');
  });
  it('blending', () => {
    expect(blendWithStreet(400_000, [500_000, 500_000])).toBe(400_000);
    const b = blendWithStreet(400_000, Array(20).fill(500_000));
    expect(b).toBeGreaterThan(450_000);
    expect(b).toBeLessThan(500_000);
  });
  it('neighbours priced unlike the home are ignored (a flat among big houses)', () => {
    expect(blendWithStreet(377_000, Array(40).fill(900_000))).toBe(377_000);
  });
  it('ranges are centred on the estimate, even from lopsided errors', async () => {
    const { rangeAround } = await import('./worth');
    const r = rangeAround(200_000, [[3, 0.02, 0.3]], 2);
    expect(r.low).toBeLessThan(200_000);
    expect(r.high).toBeGreaterThan(200_000);
    expect(Math.log(r.high / 200_000)).toBeCloseTo(Math.log(200_000 / r.low), 5);
  });
});

describe('flats count as homes', async () => {
  const { isHomeKey } = await import('./worth');
  it('APT n STREET and APT n n STREET', () => {
    expect(isHomeKey('APT 83 THE POPLAR')).toBe(true);
    expect(isHomeKey('APT 4 12 MAIN ST')).toBe(true);
  });
});
