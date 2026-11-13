import { describe, expect, it } from 'vitest';
import { addressKey, sameArea } from './address';

describe('addressKey', () => {
  it('gives the same key to the same home written three ways', () => {
    const register = addressKey('12B CHAMBER STREET, DUBLIN 8');
    const legacy = addressKey('12b Chamber St, Dublin 8, Dublin, Dublin 8, Dublin');
    const listing = addressKey('12B Chamber St., The Liberties, Dublin 8, D08 XY12');
    expect(register.key).toBe('12B CHAMBER ST');
    expect(legacy.key).toBe(register.key);
    expect(listing.key).toBe(register.key);
    expect(register.district).toBe('d8');
    expect(listing.district).toBe('d8');
  });

  it('normalises street words, apostrophes and apartment prefixes', () => {
    expect(addressKey("14 St. Mochta's Drive, Clonsilla, Dublin 15").key).toBe('14 ST MOCHTAS DR');
    expect(addressKey('Apartment 40, 20 Christchurch Place, Dublin 8').key).toBe('APT 40 20 CHRISTCHURCH PL');
    expect(addressKey('APT 40 20 CHRISTCHURCH PLACE, DUBLIN 8').key).toBe('APT 40 20 CHRISTCHURCH PL');
    expect(addressKey('No. 7 Anner Road, Inchicore').key).toBe('7 ANNER RD');
  });

  it('reads the district in its different spellings', () => {
    expect(addressKey('3 Main St, Terenure, Dublin 6W').district).toBe('d6w');
    expect(addressKey('3 Main St, Terenure, Dublin 6w, D6W EF82').district).toBe('d6w');
    expect(addressKey('2 Belmont Grove, Stillorgan, Co. Dublin').district).toBeNull();
  });

  it('marks addresses without a house number as too vague to match', () => {
    expect(addressKey('Rockville Manor, Kilternan, Dublin 18').specific).toBe(false);
    expect(addressKey('28 Castlelands, Balrothery, Balbriggan').specific).toBe(true);
  });
});

describe('sameArea', () => {
  it('requires the same district when both addresses have one', () => {
    expect(sameArea('5 Church Rd, Dublin 3', '5 CHURCH ROAD, EAST WALL, DUBLIN 3')).toBe(true);
    expect(sameArea('5 Church Rd, Dublin 3', '5 CHURCH ROAD, FINGLAS, DUBLIN 11')).toBe(false);
  });

  it('falls back to a shared locality name', () => {
    expect(sameArea('28 Castlelands, Balrothery, Balbriggan, County Dublin', '28 CASTLELANDS, BALBRIGGAN, DUBLIN')).toBe(true);
    expect(sameArea('5 Church Rd, Malahide, Co. Dublin', '5 CHURCH ROAD, SWORDS, DUBLIN')).toBe(false);
    expect(sameArea('5 Church Rd, Killiney, Co. Dublin', '5 CHURCH ROAD, KILLINEY, DUBLIN')).toBe(true);
  });
});
