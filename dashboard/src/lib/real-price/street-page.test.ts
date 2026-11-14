import { describe, expect, it } from 'vitest';
import { buildStreetPage, type StreetRow, type StreetSaleRow } from './street-page';

const NOW = new Date('2026-11-01').getTime();
const street: StreetRow = {
  slug: 'butterfield-avenue-dublin-14',
  name: 'Butterfield Avenue',
  area_key: 'd14',
  area_label: 'Dublin 14',
  sales: 0,
  first_sale: '2012-03-01',
  last_sale: '2026-06-01',
  median_recent: null,
  recent_sales: 0,
};
const sale = (date: string, address: string, price: number, extra: Partial<StreetSaleRow> = {}): StreetSaleRow => ({
  date,
  address,
  price,
  new_build: false,
  asking: null,
  beds: null,
  property_type: null,
  ...extra,
});

const rows = [
  sale('2012-03-01', '12 Butterfield Avenue, Dublin 14', 240_000),
  sale('2013-05-01', '3 Butterfield Avenue, Dublin 14', 260_000),
  sale('2014-07-01', '5 Butterfield Avenue, Dublin 14', 280_000),
  sale('2024-02-01', '12 Butterfield Avenue, Dublin 14', 600_000, { asking: 550_000, beds: 3, property_type: 'Semi-D' }),
  sale('2025-04-01', '7 Butterfield Avenue, Dublin 14', 640_000, { asking: 600_000, beds: 3, property_type: 'Semi-D' }),
  sale('2026-06-01', '9 Butterfield Avenue, Dublin 14', 580_000, { asking: 600_000, beds: 4, property_type: 'Semi-D' }),
  sale('2025-01-01', '1 Butterfield Avenue, Dublin 14', 20_000), // a part share: left out
];

describe('buildStreetPage', () => {
  const page = buildStreetPage(street, rows, [], NOW);

  it('keeps market sales only, newest first', () => {
    expect(page.count).toBe(6);
    expect(page.sales[0].date).toBe('2026-06-01');
    expect(page.lastSale).toEqual({ date: '2026-06-01', price: 580_000 });
    expect(page.firstYear).toBe(2012);
  });

  it('typical price over the last three years', () => {
    expect(page.typical).toEqual({ price: 600_000, count: 3 });
  });

  it('change since the earliest window with enough sales', () => {
    expect(page.change?.fromYears).toBe('2012–14');
    expect(page.change?.pct).toBeCloseTo(((600_000 - 260_000) / 260_000) * 100, 5);
  });

  it('asking against sold where the asking price is known', () => {
    expect(page.asking?.count).toBe(3);
    expect(page.asking?.shareAbove).toBeCloseTo(2 / 3);
    expect(page.asking?.medianOverAskingPct).toBeCloseTo((40_000 / 600_000) * 100);
  });

  it('homes that sold more than once', () => {
    expect(page.repeats).toHaveLength(1);
    expect(page.repeats[0].from.price).toBe(240_000);
    expect(page.repeats[0].to.price).toBe(600_000);
    expect(page.repeats[0].changePct).toBeCloseTo(150);
  });

  it('prices by year and the most common home', () => {
    expect(page.years.map((y) => y.year)).toEqual([2012, 2013, 2014, 2024, 2025, 2026]);
    expect(page.common).toEqual({ type: 'semi', beds: 3 });
    expect(page.areaSlug).toBe('dublin-14');
  });

  it('leaves out a block of flats sold in one transaction', () => {
    const withBlock = buildStreetPage(street, [...rows, sale('2022-08-12', 'Apt 1, 51 Butterfield Avenue, Dublin 14', 4_957_452)], [], NOW);
    expect(withBlock.count).toBe(6);
    expect(withBlock.sales.some((s) => s.price > 1_000_000)).toBe(false);
  });

  it('says nothing it cannot back: too few sales give no typical price, change or asking figures', () => {
    const thin = buildStreetPage(street, rows.slice(0, 2), [], NOW);
    expect(thin.typical).toBeNull();
    expect(thin.change).toBeNull();
    expect(thin.asking).toBeNull();
  });
});
