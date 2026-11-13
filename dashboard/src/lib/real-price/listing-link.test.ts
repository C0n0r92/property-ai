import { describe, expect, it } from 'vitest';
import { parseListingLink } from './listing-link';

describe('parseListingLink', () => {
  it('reads a MyHome brochure link', () => {
    expect(parseListingLink('https://www.myhome.ie/residential/brochure/3-butterfield-avenue-rathfarnham-dublin-14/5041236')).toEqual({
      site: 'myhome',
      id: '5041236',
      address: '3 Butterfield Avenue, Rathfarnham, Dublin 14',
      streetKey: '3 BUTTERFIELD AVE',
      streetKeys: ['3 BUTTERFIELD AVE RATHFARNHAM', '3 BUTTERFIELD AVE'],
      district: 'd14',
      typeHint: null,
    });
  });

  it('reads a Daft link, its home type and address', () => {
    expect(parseListingLink('https://www.daft.ie/for-sale/semi-detached-house-53a-ashmount-court-kilmainham-dublin-8/6458297?utm=x')).toEqual({
      site: 'daft',
      id: '6458297',
      address: '53a Ashmount Court, Kilmainham, Dublin 8',
      streetKey: '53A ASHMOUNT CT',
      streetKeys: ['53A ASHMOUNT CT KILMAINHAM', '53A ASHMOUNT CT'],
      district: 'd8',
      typeHint: 'semi',
    });
  });

  it('handles Daft apartments and county addresses without a district', () => {
    const link = parseListingLink('daft.ie/for-sale/apartment-apartment-20-coultry-centre-ballymun-dublin-9/6458242');
    expect(link?.typeHint).toBe('apartment');
    expect(link?.district).toBe('d9');
    const county = parseListingLink('https://www.myhome.ie/residential/brochure/18-brookdale-avenue-swords-co-dublin/5041295');
    expect(county?.address).toBe('18 Brookdale Avenue, Swords, Co Dublin');
    expect(county?.district).toBeNull();
  });

  it('rejects other sites and malformed links', () => {
    expect(parseListingLink('https://example.com/for-sale/house/123')).toBeNull();
    expect(parseListingLink('https://www.daft.ie/for-sale/no-id-here')).toBeNull();
    expect(parseListingLink('not a link')).toBeNull();
  });

  it('offers shorter street names when the street has no Road, Park or similar', () => {
    const link = parseListingLink('https://www.daft.ie/for-sale/apartment-89-rath-gael-clondalkin-dublin-22/6695773')!;
    expect(link.typeHint).toBe('apartment');
    expect(link.district).toBe('d22');
    expect(link.streetKeys).toEqual(['89 RATH GAEL CLONDALKIN', '89 RATH GAEL']);
  });

  it('gives no street names without a house number', () => {
    const link = parseListingLink('https://www.daft.ie/for-sale/detached-house-the-old-rectory-howth-dublin-13/1234567')!;
    expect(link.streetKeys).toEqual([]);
  });
});
