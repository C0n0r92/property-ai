import { describe, expect, it } from 'vitest';
import { decisionOf, kindsOf, planningSite } from './planning';

describe('decisionOf', () => {
  it('reads the councils’ many spellings', () => {
    expect(decisionOf('GRANT PERMISSION')).toBe('granted');
    expect(decisionOf('GRANT PERMISSION FOR RETENTION')).toBe('granted');
    expect(decisionOf('GRANT PERMISSION & REFUSE PERMISSION')).toBe('part');
    expect(decisionOf('REFUSE PERMISSION')).toBe('refused');
    expect(decisionOf('APPLICATION DECLARED INVA')).toBe('invalid');
    expect(decisionOf('Invalid - Site Notice')).toBe('invalid');
    expect(decisionOf('WITHDRAW THE APPLICATION')).toBe('withdrawn');
    expect(decisionOf('Declared Withdrawn')).toBe('withdrawn');
    expect(decisionOf('REQUEST ADDITIONAL INFORMATION')).toBe('pending');
    expect(decisionOf('')).toBe('pending');
    expect(decisionOf(null)).toBe('pending');
    expect(decisionOf('Declared Exempt')).toBe('other');
    expect(decisionOf('GRANT EXTENSION OF DURATION OF PERM.')).toBe('other');
  });
});

describe('kindsOf', () => {
  it('picks out what the work is', () => {
    expect(
      kindsOf('Single storey extension to the rear, attic conversion with dormer window to rear, and associated site works')
    ).toEqual(['extension', 'attic']);
    expect(kindsOf('Construction of 2 no. two-storey semi-detached dwellings')).toEqual(['new homes']);
    expect(kindsOf('Change of use from retail to residential')).toEqual(['change of use']);
    expect(kindsOf('Demolition of existing shed')).toEqual(['demolition']);
    expect(kindsOf('Installation of solar panels on the roof')).toEqual(['solar']);
    expect(kindsOf('Widening of vehicular entrance and dishing of kerb')).toEqual(['driveway']);
    expect(kindsOf('Something else entirely')).toEqual([]);
  });
});

describe('planningSite', () => {
  it('ties an application to a home and street when it has a house number', () => {
    const site = planningSite('19, Cremore Crescent, Dublin 11, Glasnevin D11 X9C5');
    expect(site.homeKey).toBe('19 CREMORE CRES');
    expect(site.district).toBe('d11');
    expect(site.streetSlug).toBe('cremore-crescent-dublin-11');
  });

  it('a site without a house number has no home', () => {
    const site = planningSite("Lands at Tara Street Dublin 2 and George's Quay, Dublin 2");
    expect(site.homeKey).toBeNull();
  });
});

describe('workSummary', () => {
  const row = (kinds: string[], description: string) => ({
    appNumber: '1', authority: 'x', address: 'x', description, kinds, decision: 'granted', received: null, decided: null,
  });
  it('names the kinds of work, or shortens the description', async () => {
    const { workSummary } = await import('./planning-data');
    expect(workSummary(row(['extension', 'attic'], ''))).toBe('Extension and attic or dormer');
    expect(workSummary(row(['extension', 'attic', 'solar'], ''))).toBe('Extension, attic or dormer and solar panels');
    expect(workSummary(row([], 'Retention of a garden shed in the rear garden of the existing house'), 30)).toBe('Retention of a garden shed in…');
  });
});
