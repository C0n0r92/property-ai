import { describe, expect, it } from 'vitest';
import { alertTarget, matchSale, soldEmail, type OpenAlert } from './sold-alerts';

const alert: OpenAlert = {
  id: 1,
  email: 'buyer@example.com',
  address: '12 Butterfield Avenue, Rathfarnham, Dublin 14',
  address_key: '12 BUTTERFIELD AVE',
  district: 'd14',
  asking_price: 575_000,
  predicted_mid: 610_000,
  token: 'tok_abcdefghijklmnopqrstuvwxyz',
  created_at: '2026-06-01T10:00:00Z',
  county: 'Dublin',
};

describe('alertTarget', () => {
  it('needs a house number, so one alert is one home', () => {
    expect(alertTarget('12 Butterfield Avenue, Dublin 14')).toEqual({ key: '12 BUTTERFIELD AVE', district: 'd14' });
    expect(alertTarget('Butterfield Avenue, Dublin 14')).toBeNull();
    expect(alertTarget('Rose Cottage, Howth')).toBeNull();
  });
});

describe('matchSale', () => {
  const sale = (date: string, address: string, price: number, district: string | null = 'd14', county = 'Dublin') => ({
    id: `${date}-${price}`,
    date,
    address,
    price,
    district,
    county,
  });

  it('the first sale of the home after the alert was set', () => {
    const found = matchSale(alert, [
      sale('2019-03-01', '12 Butterfield Avenue, Dublin 14', 380_000),
      sale('2026-09-14', '12 Butterfield Ave, Rathfarnham, Dublin 14', 612_000),
    ]);
    expect(found?.price).toBe(612_000);
  });

  it('allows a sale registered shortly before the alert (sale agreed earlier)', () => {
    expect(matchSale(alert, [sale('2026-05-25', '12 Butterfield Avenue, Dublin 14', 600_000)])?.price).toBe(600_000);
  });

  it('ignores older sales, other districts and part-shares', () => {
    expect(matchSale(alert, [sale('2025-01-01', '12 Butterfield Avenue, Dublin 14', 500_000)])).toBeNull();
    expect(matchSale(alert, [sale('2026-09-14', '12 Butterfield Avenue, Dublin 16', 612_000, 'd16')])).toBeNull();
    expect(matchSale(alert, [sale('2026-09-14', '12 Butterfield Avenue, Dublin 14', 30_000)])).toBeNull();
  });

  it('outside Dublin: the same county and town', () => {
    const kildare = { ...alert, address: '12 Station Walk, Newbridge, Co. Kildare', address_key: '12 STATION WALK', district: null, county: 'Kildare' };
    expect(matchSale(kildare, [sale('2026-09-14', '12 Station Walk, Rickardstown, Newbridge', 410_000, null, 'Kildare')])?.price).toBe(410_000);
    // The same street and town name in another county is another home
    const wicklow = { ...alert, address: '1 Main Street, Newcastle, Co. Wicklow', address_key: '1 MAIN ST', district: null, county: 'Wicklow' };
    expect(matchSale(wicklow, [sale('2026-09-14', '1 Main Street, Newcastle, Co. Dublin', 500_000, null, 'Dublin')])).toBeNull();
  });

  it('with no district on one side, the town must agree', () => {
    const noDistrict = { ...alert, address: '12 Butterfield Avenue, Rathfarnham', district: null };
    expect(matchSale(noDistrict, [sale('2026-09-14', '12 Butterfield Avenue, Rathfarnham, Dublin 14', 612_000)])?.price).toBe(612_000);
    expect(matchSale(noDistrict, [sale('2026-09-14', '12 Butterfield Avenue, Swords', 612_000, null)])).toBeNull();
  });
});

describe('soldEmail', () => {
  const mail = soldEmail(alert, { date: '2026-09-14', price: 612_000 }, 'https://irishpropertydata.com', '/streets/butterfield-avenue-dublin-14');

  it('leads with the price, against asking and our estimate', () => {
    expect(mail.subject).toBe('12 Butterfield Avenue sold for €612,000');
    expect(mail.text).toContain('€612,000');
    expect(mail.text).toContain('6.4% over its asking price of €575,000');
    expect(mail.text).toContain('Our price check said about €610,000');
    expect(mail.text).toContain('https://irishpropertydata.com/streets/butterfield-avenue-dublin-14');
  });

  it('escapes the address in the HTML', () => {
    const odd = soldEmail({ ...alert, address: '12 <b>Odd</b> Road, Dublin 8' }, { date: '2026-09-14', price: 612_000 }, 'https://x.ie', null);
    expect(odd.html).not.toContain('<b>Odd</b>');
    expect(odd.html).toContain('&lt;b&gt;Odd&lt;/b&gt;');
  });

  it('under asking and without an estimate', () => {
    const under = soldEmail({ ...alert, predicted_mid: null }, { date: '2026-09-14', price: 550_000 }, 'https://x.ie', null);
    expect(under.text).toContain('4.3% under its asking price');
    expect(under.text).not.toContain('Our price check said');
  });
});
