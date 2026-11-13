import { describe, expect, it } from 'vitest';
import { areaKeyFromSlug, areaSlug, buildAreaPage } from './area-page';
import { buildStore } from './store';

describe('area slugs', () => {
  it('turns district keys into readable addresses and back', () => {
    expect(areaSlug('d8')).toBe('dublin-8');
    expect(areaSlug('d6w')).toBe('dublin-6w');
    expect(areaKeyFromSlug('dublin-8')).toBe('d8');
    expect(areaKeyFromSlug('dublin-6w')).toBe('d6w');
    expect(areaKeyFromSlug('Dublin-6W')).toBe('d6w');
  });

  it('keeps locality keys as they are', () => {
    expect(areaSlug('rathmines')).toBe('rathmines');
    expect(areaKeyFromSlug('rathmines')).toBe('rathmines');
    expect(areaKeyFromSlug('../etc')).toBeNull();
  });
});

describe('buildAreaPage', () => {
  const now = Date.parse('2026-11-10');
  const day = (d: number) => new Date(now - d * 86_400_000).toISOString().slice(0, 10);
  const raw = [];
  for (let i = 0; i < 60; i++) {
    raw.push({
      address: `${i} Main Street, Rialto, Dublin 8`,
      soldDate: day(i * 5),
      askingPrice: 400_000,
      soldPrice: 400_000 + (i % 10) * 8_000,
      beds: 2 + (i % 2),
      propertyType: i % 3 ? 'Terraced House' : 'Apartment',
      areaSqm: 80,
    });
  }
  for (let i = 0; i < 40; i++) {
    raw.push({
      address: `${i} Long Road, Dublin 12`,
      soldDate: day(i * 7),
      askingPrice: 350_000,
      soldPrice: 350_000 + (i % 5) * 4_000,
      beds: 3,
      propertyType: 'Semi-Detached House',
    });
  }
  const store = buildStore(raw, now);

  it('profiles the area over the last year with its rank among districts', () => {
    const page = buildAreaPage(store, 'd8')!;
    expect(page.label).toBe('Dublin 8');
    expect(page.slug).toBe('dublin-8');
    expect(page.profile.count).toBeGreaterThan(50);
    expect(page.profile.shareAboveAsking).toBeCloseTo(0.9, 1);
    expect(page.rank).toEqual({ position: 1, of: 2 });
    expect(page.dublin.medianOverAskingPct).toBeGreaterThan(0);
  });

  it('builds a street of recent sales of the commonest home type', () => {
    const page = buildAreaPage(store, 'd8')!;
    expect(page.street.type).toBe('terraced');
    expect(page.street.sales.length).toBe(5);
    expect(page.street.sales[0].soldDate >= page.street.sales[4].soldDate).toBe(true);
  });

  it('returns null for an area the check does not know', () => {
    expect(buildAreaPage(store, 'd99')).toBeNull();
  });
});
