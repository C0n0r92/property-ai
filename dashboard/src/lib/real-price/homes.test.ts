import { describe, expect, it } from 'vitest';
import { homeIdentities } from './homes';

const ids = (addresses: string[], county = 'Dublin') => homeIdentities(addresses.map((address) => ({ address })), county).map((h) => h?.homeId ?? null);

describe('homeIdentities', () => {
  it('a register sale and a listing of the same home agree, however each writes it', () => {
    const [register, listing, other] = ids([
      '12 Butterfield Avenue, Rathfarnham, Dublin 14',
      '12 Butterfield Ave, Dublin 14, D14 X9C5',
      '12 Butterfield Avenue, Rathfarnham',
    ]);
    expect(register).toBe('Dublin|d14|12 BUTTERFIELD AVE');
    expect(listing).toBe(register);
    // Written without the district: joined to the district by the other records on the street
    expect(other).toBe(register);
  });

  it('flats keep their flat number', () => {
    const [a, b] = ids(['Apartment 83, The Poplar, Trimbleston, Goatstown, Dublin 14', 'Apt 84, The Poplar, Goatstown, Dublin 14']);
    expect(a).not.toBe(b);
    expect(a).toContain('APT 83');
  });

  it('the same house number and street in two towns are two homes', () => {
    const [naas, newbridge] = ids(['5 Main Street, Naas', '5 Main Street, Newbridge'], 'Kildare');
    expect(naas).not.toBe(newbridge);
    expect(naas).toBe('Kildare|naas-kildare|5 MAIN ST');
  });

  it('an estate name split by estate stays two streets', () => {
    const elsewhere = ['Lucan', 'Swords', 'Malahide', 'Skerries', 'Rush'].map((t, i) => `${i + 1} Main Street, ${t}`);
    const out = ids([
      ...elsewhere,
      ...[5, 6, 7].map((n) => `${n} Main Street, Howth, Dublin 13`),
      ...[5, 6, 7].map((n) => `${n} Main Street, Baldoyle, Dublin 13`),
    ]);
    expect(out[5]).not.toBe(out[8]);
    expect(out[5]).toContain('main-street-howth-dublin-13');
  });

  it('no house number, no home', () => {
    expect(ids(['Rose Cottage, Howth', 'New Homes, Foxrock Grove, Kill Lane, Deansgrange, County Dublin'])).toEqual([null, null]);
  });
});

describe('"Co., Dublin" is not a town', () => {
  it('a listing written "Co., Dublin" lands on the register home', () => {
    const [register, listing] = ids(['12 Peyton Drive, Rathcoole, Dublin', '12 Peyton Drive, Rathcoole, Co., Dublin']);
    expect(listing).toBe(register);
  });
});

describe('reconcileHomes', async () => {
  const { reconcileHomes } = await import('./homes');
  it('the same Eircode is the same home, the register’s id wins', () => {
    const out = reconcileHomes([
      { table: 'register_sales', homeId: 'Dublin|dun-laoghaire|18 VESEY PL', addressKey: '18 VESEY PL', eircode: 'A96X2Y3' },
      { table: 'listings', homeId: 'Dublin|monkstown|18 VESEY PL', addressKey: '18 VESEY PL', eircode: 'A96 X2Y3' },
    ]);
    expect(out).toEqual(['Dublin|dun-laoghaire|18 VESEY PL', 'Dublin|dun-laoghaire|18 VESEY PL']);
  });

  it('a house and street found once on the register takes the other sources’ records of it', () => {
    const out = reconcileHomes([
      { table: 'register_sales', homeId: 'Dublin|kinsealy|20 HOLYWELL CRES S', addressKey: '20 HOLYWELL CRES S' },
      { table: 'listings', homeId: 'Dublin|swords|20 HOLYWELL CRES S', addressKey: '20 HOLYWELL CRES S' },
      { table: 'planning_applications', homeId: 'Dublin|swords|20 HOLYWELL CRES S', addressKey: '20 HOLYWELL CRES S' },
    ]);
    expect(new Set(out)).toEqual(new Set(['Dublin|kinsealy|20 HOLYWELL CRES S']));
  });

  it('a key found in two register homes is left alone (two different homes)', () => {
    const out = reconcileHomes([
      { table: 'register_sales', homeId: 'Dublin|d18|41 THE ASH|a', addressKey: '41 THE ASH' },
      { table: 'register_sales', homeId: 'Dublin|d18|41 THE ASH|b', addressKey: '41 THE ASH' },
      { table: 'listings', homeId: 'Dublin|d18|41 THE ASH|c', addressKey: '41 THE ASH' },
    ]);
    expect(out[2]).toBe('Dublin|d18|41 THE ASH|c');
  });

  it('records with no home stay without one', () => {
    expect(reconcileHomes([{ table: 'listings', homeId: null, addressKey: 'ROSE COTTAGE' }])).toEqual([null]);
  });
});
