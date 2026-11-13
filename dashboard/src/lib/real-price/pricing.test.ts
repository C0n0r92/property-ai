import { describe, expect, it } from 'vitest';
import { reportPrice } from './pricing';

describe('reportPrice', () => {
  it('charges the launch price until the end of 31 December 2026 (Dublin time)', () => {
    const p = reportPrice(Date.parse('2026-12-31T23:59:00Z'));
    expect(p).toMatchObject({ cents: 999, label: '€9.99', isLaunch: true, regularLabel: '€19', launchEndsLabel: '31 December' });
  });

  it('charges the regular price from 1 January 2027', () => {
    const p = reportPrice(Date.parse('2027-01-01T00:00:00Z'));
    expect(p).toMatchObject({ cents: 1900, label: '€19', isLaunch: false });
  });

  it('shows whole euro amounts without cents', () => {
    expect(reportPrice(Date.parse('2027-06-01T12:00:00Z')).label).toBe('€19');
  });
});
