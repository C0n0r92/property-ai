import { describe, expect, it } from 'vitest';
import { assignStreets, displayStreetName, isBulkSale, streetIdentity, streetSlug } from './streets';

describe('streetIdentity', () => {
  it('a numbered home in a postal district', () => {
    expect(streetIdentity('12 Butterfield Avenue, Rathfarnham, Dublin 14')).toEqual({
      streetKey: 'BUTTERFIELD AVE',
      areaKey: 'd14',
      areaLabel: 'Dublin 14',
      name: 'Butterfield Avenue',
      slug: 'butterfield-avenue-dublin-14',
    });
  });

  it('spellings of the same street agree', () => {
    const a = streetIdentity('3 Butterfield Ave, Dublin 14');
    const b = streetIdentity('44 BUTTERFIELD AVENUE, RATHFARNHAM, DUBLIN 14');
    expect(a?.slug).toBe('butterfield-avenue-dublin-14');
    expect(b?.slug).toBe(a?.slug);
  });

  it('a home outside the postal districts takes its town', () => {
    const id = streetIdentity('54 Castlegate Crescent, Adamstown, Lucan');
    expect(id?.areaKey).toBe('lucan');
    expect(id?.slug).toBe('castlegate-crescent-lucan');
  });

  it('apartments belong to their building or street', () => {
    expect(streetIdentity('Apartment 40, 7 Chamber Street, Dublin 8')?.streetKey).toBe('CHAMBER ST');
    expect(streetIdentity('Apt 4, Rath Gael, Dublin 6')?.streetKey).toBe('RATH GAEL');
  });

  it('Saint and Street are told apart in the slug', () => {
    expect(streetIdentity("13 St. Helen'S Way, St. Helen'S, Adamstown")?.slug).toBe('st-helens-way-adamstown');
    expect(streetIdentity('5 Thomas St, Dublin 8')?.slug).toBe('thomas-street-dublin-8');
  });

  it('directions spelled out', () => {
    expect(streetIdentity('100 N Circular Rd, Dublin 7')?.slug).toBe('north-circular-road-dublin-7');
  });

  it('no house number, a one-word name or no area gives no street', () => {
    expect(streetIdentity('Helm Crag, Killiney Rd, Killiney')).toBeNull();
    expect(streetIdentity('4 Whitebarn, Dublin 14')).toBeNull();
    expect(streetIdentity('12 Main Street, Dublin')).toBeNull();
    expect(streetIdentity('')).toBeNull();
  });
});

describe('displayStreetName', () => {
  it('tidies the register capitalisation', () => {
    expect(displayStreetName("13 St. Helen'S Way")).toBe("St. Helen's Way");
    expect(displayStreetName('44 BUTTERFIELD AVENUE')).toBe('Butterfield Avenue');
    expect(displayStreetName("2 o'connell street upper")).toBe("O'Connell Street Upper");
    expect(displayStreetName('Apartment 4 Rath Gael')).toBe('Rath Gael');
  });
});

describe('streetSlug', () => {
  it('is url-safe', () => {
    expect(streetSlug('ST JAMESS TCE', 'd8')).toBe('st-jamess-terrace-dublin-8');
    expect(streetSlug('PK VIEW', 'swords')).toBe('park-view-swords');
  });
});

describe('assignStreets', () => {
  it('joins a sale without a district to the district street on the same street and town', () => {
    const [a, b, c] = assignStreets([
      '12 Butterfield Avenue, Rathfarnham, Dublin 14',
      '30 Butterfield Avenue, Rathfarnham',
      '5 Castlegate Crescent, Adamstown, Lucan',
    ]);
    expect(a?.slug).toBe('butterfield-avenue-dublin-14');
    expect(b?.slug).toBe('butterfield-avenue-dublin-14');
    expect(b?.areaLabel).toBe('Dublin 14');
    expect(c?.slug).toBe('castlegate-crescent-lucan');
  });
});

describe('street names and keys, tidied', () => {
  it('spells out short forms in names', () => {
    expect(displayStreetName('12 South Circular Rd')).toBe('South Circular Road');
    expect(displayStreetName('St. Kevins Tce')).toBe('St. Kevins Terrace');
    expect(displayStreetName('4 Mount St Upr')).toBe('Mount Street Upper');
  });

  it('strips number ranges', () => {
    expect(displayStreetName('18-21 Mount Street Lower')).toBe('Mount Street Lower');
    expect(displayStreetName('18/21 Lower Mount Street')).toBe('Lower Mount Street');
  });

  it('Upper and Lower in front or behind are the same street', () => {
    const a = streetIdentity('18-21 Mount Street Lower, Dublin 2');
    const b = streetIdentity('18/21 Lower Mount Street, Dublin 2');
    expect(a?.slug).toBe('mount-street-lower-dublin-2');
    expect(b?.slug).toBe(a?.slug);
  });
});

describe('generic street names', () => {
  const towns = ['Lucan', 'Swords', 'Malahide', 'Skerries', 'Rush'];
  const elsewhere = towns.map((t, i) => `${i + 1} Main Street, ${t}`);

  it('a name used across Dublin is split by the town or estate in the address', () => {
    const out = assignStreets([
      ...elsewhere,
      ...[5, 6, 7].map((n) => `${n} Main Street, Howth, Dublin 13`),
      ...[8, 9, 10].map((n) => `${n} Main Street, Baldoyle, Dublin 13`),
    ]);
    expect(out[5]?.slug).toBe('main-street-howth-dublin-13');
    expect(out[5]?.areaLabel).toBe('Howth, Dublin 13');
    expect(out[8]?.slug).toBe('main-street-baldoyle-dublin-13');
  });

  it('a sale naming no town joins the dominant one, or none when it is unclear', () => {
    const clear = assignStreets([
      ...elsewhere,
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((n) => `${n} Main Street, Howth, Dublin 13`),
      ...[20, 21, 22, 23].map((n) => `${n} Main Street, Baldoyle, Dublin 13`),
      '40 Main Street, Dublin 13',
    ]);
    expect(clear[clear.length - 1]?.slug).toBe('main-street-howth-dublin-13');

    const unclear = assignStreets([
      ...elsewhere,
      ...[5, 6, 7].map((n) => `${n} Main Street, Howth, Dublin 13`),
      ...[8, 9, 10].map((n) => `${n} Main Street, Baldoyle, Dublin 13`),
      '40 Main Street, Dublin 13',
    ]);
    expect(unclear[unclear.length - 1]).toBeNull();
  });

  it('a distinctive name stays one street whatever neighbourhood the address gives', () => {
    const [a, b] = assignStreets(['12 Kildare Road, Crumlin, Dublin 12', '30 Kildare Road, Kimmage, Dublin 12']);
    expect(a?.slug).toBe('kildare-road-dublin-12');
    expect(b?.slug).toBe('kildare-road-dublin-12');
  });
});

describe('long roads through several areas', () => {
  it('are not split when one neighbourhood dominates the addresses', () => {
    const elsewhere = ['Dublin 6', 'Dublin 12', 'Dublin 2', 'Dublin 4'].map((d, i) => `${i + 1} South Circular Road, ${d}`);
    const out = assignStreets([
      ...elsewhere,
      ...[10, 11, 12, 13, 14, 15].map((n) => `${n} South Circular Road, Portobello, Dublin 8`),
      '16 South Circular Road, Kilmainham, Dublin 8',
      '17 South Circular Road, Dublin 8',
    ]);
    const d8 = out.slice(4);
    expect(new Set(d8.map((s) => s?.slug))).toEqual(new Set(['south-circular-road-dublin-8']));
    expect(d8[0]?.areaLabel).toBe('Dublin 8');
  });
});

describe('isBulkSale', () => {
  it('a block of flats sold in one go is not one home', () => {
    expect(isBulkSale('Apt 1, 45 Francis St, Dublin 8', 44_404_192, 217_500)).toBe(true);
    expect(isBulkSale('1a Hazelwood Apts, Northwood, Santry', 6_415_000, 103_524)).toBe(true);
    expect(isBulkSale('Apt 1, 51 Main St, Clongriffin Dublin 13', 4_957_452, 300_000)).toBe(true);
  });

  it('a big house on an ordinary street is kept unless far out of line', () => {
    expect(isBulkSale('327 North Circular Rd, Dublin 7', 1_425_000, 353_000)).toBe(false);
    expect(isBulkSale('12 Some Road, Dublin 4', 4_000_000, 450_000)).toBe(true);
    expect(isBulkSale('Apt 3, 2 Some Road, Dublin 4', 600_000, 450_000)).toBe(false);
  });
});
