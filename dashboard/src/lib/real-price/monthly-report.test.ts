import { describe, expect, it } from 'vitest';
import { availableMonths, buildMonthlyReport, monthLabel } from './monthly-report';
import { buildStore } from './store';

const raw: Array<Record<string, unknown>> = [];
// 200 sales a month for Jan 2025 to Oct 2026, ratio rising by month
for (let m = 0; m < 22; m++) {
  const year = 2025 + Math.floor(m / 12);
  const month = (m % 12) + 1;
  for (let i = 0; i < 200; i++) {
    const day = 1 + (i % 27);
    raw.push({
      address: `${i} Road ${m}, ${i % 2 ? 'Rialto, Dublin 8' : 'Dublin 12'}`,
      soldDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      askingPrice: 400_000 + (i % 5) * 150_000,
      soldPrice: Math.round((400_000 + (i % 5) * 150_000) * (1 + (m * 0.002) + (i % 10) * 0.01)),
      beds: 3,
      propertyType: i % 3 ? 'Semi-Detached House' : 'Apartment',
    });
  }
}
// A thin, unfinished month
for (let i = 0; i < 20; i++) {
  raw.push({ address: `${i} Late Road, Dublin 8`, soldDate: '2026-11-03', askingPrice: 400_000, soldPrice: 420_000, beds: 3, propertyType: 'Apartment' });
}
const store = buildStore(raw as never[], Date.parse('2026-11-10'));

describe('monthly report', () => {
  it('lists only months with enough sales, newest first', () => {
    const months = availableMonths(store);
    expect(months[0]).toBe('2026-10');
    expect(months).not.toContain('2026-11');
  });

  it('compares the month with the one before and the same month a year earlier', () => {
    const r = buildMonthlyReport(store, '2026-10')!;
    expect(r.label).toBe('October 2026');
    expect(r.count).toBe(200);
    expect(r.previous?.month).toBe('2026-09');
    expect(r.yearAgo?.month).toBe('2025-10');
    expect(r.medianOverAskingPct).toBeGreaterThan(r.yearAgo!.medianOverAskingPct);
    expect(r.trend.length).toBe(13);
    expect(r.trend[r.trend.length - 1].month).toBe('2026-10');
  });

  it('breaks the month down by district, type and price band', () => {
    const r = buildMonthlyReport(store, '2026-10')!;
    expect(r.districts.map((d) => d.key).sort()).toEqual(['d12', 'd8']);
    expect(r.byType.map((t) => t.type).sort()).toEqual(['apartment', 'semi']);
    expect(r.bands.reduce((n, b) => n + b.count, 0)).toBe(200);
    expect(r.biggest.length).toBe(5);
    expect(r.biggest[0].overAskingPct).toBeGreaterThanOrEqual(r.biggest[4].overAskingPct);
  });

  it('refuses months without enough sales', () => {
    expect(buildMonthlyReport(store, '2026-11')).toBeNull();
    expect(buildMonthlyReport(store, 'nonsense')).toBeNull();
    expect(monthLabel('2026-03')).toBe('March 2026');
  });
});
