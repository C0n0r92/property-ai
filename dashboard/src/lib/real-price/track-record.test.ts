import { describe, expect, it } from 'vitest';
import type { Sale } from './model';
import { computeTrackRecord, summarise, type TrackTest } from './track-record';

const DAY = 86_400_000;
const START = new Date('2025-01-01').getTime();

/** Every home asks 400k and sells for 440k (+10%), one a day, in one area. */
function steadyMarket(days: number, ratio = 1.1): Sale[] {
  return Array.from({ length: days }, (_, i) => {
    const t = START + i * DAY;
    return {
      address: `${i + 1} Test Road, Dublin 8`,
      soldDate: new Date(t).toISOString().slice(0, 10),
      t,
      askingPrice: 400_000,
      soldPrice: Math.round(400_000 * ratio),
      ratio,
      beds: 3,
      typeGroup: 'terraced',
      areaKeys: ['d8'],
    } satisfies Sale;
  });
}

describe('computeTrackRecord', () => {
  it('in a steady market every sale is predicted exactly', () => {
    const sales = steadyMarket(500);
    const record = computeTrackRecord(sales, sales[sales.length - 1].t, 6);
    expect(record.overall.tested).toBeGreaterThan(150);
    expect(record.overall.insideRangePct).toBe(100);
    expect(record.overall.medianModelErrorPct).toBe(0);
    // Asking was 10% under every sale (400k against 440k)
    expect(record.overall.medianAskingErrorPct).toBeCloseTo((40_000 / 440_000) * 100);
    expect(record.overall.closerThanAskingPct).toBe(100);
  });

  it('uses only sales before each one: a sudden jump is missed, not foreseen', () => {
    const calm = steadyMarket(400, 1.0);
    const hot = steadyMarket(30, 1.3).map((s, i) => {
      const t = calm[calm.length - 1].t + (i + 1) * DAY;
      return { ...s, t, soldDate: new Date(t).toISOString().slice(0, 10) };
    });
    const sales = [...calm, ...hot];
    const record = computeTrackRecord(sales, sales[sales.length - 1].t, 1);
    // The first hot sales are predicted at asking (the calm market), so they miss
    const first = record.recent[record.recent.length - 1];
    expect(first.mid).toBe(400_000);
    expect(first.inRange).toBe(false);
  });

  it('groups by month and type, newest examples first', () => {
    const sales = steadyMarket(500);
    const record = computeTrackRecord(sales, sales[sales.length - 1].t, 3);
    expect(record.byMonth.length).toBeGreaterThanOrEqual(3);
    expect(record.byType.map((t) => t.type)).toEqual(['terraced']);
    expect(record.recent[0].soldDate >= record.recent[1].soldDate).toBe(true);
    expect(record.recent.length).toBeLessThanOrEqual(15);
  });

  it('skips sales with nothing to compare against', () => {
    const record = computeTrackRecord(steadyMarket(3), START + 3 * DAY, 12);
    expect(record.overall.tested).toBe(0);
  });
});

describe('summarise', () => {
  it('shares and medians', () => {
    const t = (modelError: number, askingError: number, inRange: boolean): TrackTest =>
      ({ modelError, askingError, inRange, inLikely: inRange }) as TrackTest;
    const s = summarise([t(0.02, 0.1, true), t(0.08, 0.05, true), t(0.2, 0.1, false), t(0.04, 0.0, true)]);
    expect(s.insideRangePct).toBe(75);
    expect(s.medianModelErrorPct).toBeCloseTo(6);
    expect(s.closerThanAskingPct).toBe(25);
    expect(s.within5Pct).toBe(50);
    expect(s.within10Pct).toBe(75);
  });
});
