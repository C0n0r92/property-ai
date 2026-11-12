import { describe, expect, it } from 'vitest';
import { analyse, type Sale } from './model';
import { FREE_SALES, toPublicResult } from './public';
import { checkoutSchema, emailSchema, isEircode } from './schema';

const AS_OF = Date.parse('2025-12-31');

function sales(n: number): Sale[] {
  return Array.from({ length: n }, (_, i) => {
    const ratio = 0.95 + (0.2 * i) / (n - 1);
    const t = AS_OF - i * 86_400_000;
    return {
      address: `${i + 1} Test Road, Kilmainham, Dublin 8`,
      soldDate: new Date(t).toISOString().slice(0, 10),
      t,
      askingPrice: 400_000,
      soldPrice: Math.round(400_000 * ratio),
      ratio,
      beds: 3,
      typeGroup: 'terraced' as const,
      areaKeys: ['d8', 'kilmainham'],
    };
  });
}

describe('toPublicResult', () => {
  const query = { areaKey: 'd8', typeGroup: 'terraced' as const, beds: 3, askingPrice: 400_000 };
  const full = analyse(sales(101), query, AS_OF, 30)!;
  const open = toPublicResult(full);

  it('keeps the headline answer and the chart', () => {
    expect(open.prediction.mid).toBe(full.prediction.mid);
    expect(open.prediction.likelyLow).toBe(full.prediction.likelyLow);
    expect(open.prediction.medianOverAskingPct).toBe(full.prediction.medianOverAskingPct);
    expect(open.prediction.shareAboveAsking).toBe(full.prediction.shareAboveAsking);
    expect(open.dots).toEqual(full.dots);
    expect(open.evidence.count).toBe(101);
  });

  it('withholds the upper bid levels, the ladder and the budget', () => {
    const prediction = open.prediction as Record<string, unknown>;
    expect(prediction.high).toBeUndefined();
    expect(prediction.likelyHigh).toBeUndefined();
    expect((open as unknown as Record<string, unknown>).bidLadder).toBeUndefined();
    expect((open as unknown as Record<string, unknown>).budget).toBeUndefined();
  });

  it('shows only the first few comparable sales and counts the rest', () => {
    expect(open.evidence.recent).toHaveLength(FREE_SALES);
    expect(open.evidence.recent[0]).toEqual(full.evidence.recent[0]);
    expect(open.lockedSales).toBe(101 - FREE_SALES);
  });

  it('gives the gap between the even-odds and rarely-beaten bids, rounded', () => {
    expect(open.gapToRarelyBeaten % 1000).toBe(0);
    expect(Math.abs(open.gapToRarelyBeaten - (full.prediction.high - full.prediction.mid))).toBeLessThanOrEqual(500);
  });
});

describe('isEircode', () => {
  it('accepts real Eircode formats with or without a space', () => {
    expect(isEircode('D08 TW8P')).toBe(true);
    expect(isEircode('d08tw8p')).toBe(true);
    expect(isEircode('D6W EF82')).toBe(true);
    expect(isEircode('A94 DD51')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isEircode('D08')).toBe(false);
    expect(isEircode('SW1A 1AA')).toBe(false);
    expect(isEircode('B12 3456')).toBe(false);
    expect(isEircode('')).toBe(false);
  });
});

describe('checkoutSchema', () => {
  const query = { areaKey: 'd8', typeGroup: 'terraced', beds: 2, askingPrice: 395_000 };

  it('requires the address of the home', () => {
    expect(checkoutSchema.safeParse({ query }).success).toBe(false);
    expect(checkoutSchema.safeParse({ query, address: 'abc' }).success).toBe(false);
    expect(checkoutSchema.safeParse({ query, address: '14 Rialto Street, Dublin 8' }).success).toBe(true);
  });

  it('normalises a valid Eircode and rejects a bad one', () => {
    const ok = checkoutSchema.safeParse({ query, address: '14 Rialto Street', eircode: 'd08 tw8p' });
    expect(ok.success && ok.data.eircode).toBe('D08TW8P');
    expect(checkoutSchema.safeParse({ query, address: '14 Rialto Street', eircode: 'nope' }).success).toBe(false);
    const blank = checkoutSchema.safeParse({ query, address: '14 Rialto Street', eircode: '' });
    expect(blank.success && blank.data.eircode).toBeUndefined();
  });
});

describe('emailSchema', () => {
  const query = { areaKey: 'd8', typeGroup: 'terraced', beds: 2, askingPrice: 395_000 };

  it('accepts a normal request and lower-cases the email', () => {
    const parsed = emailSchema.safeParse({ email: ' Ann@Example.ie ', query, marketingConsent: true });
    expect(parsed.success && parsed.data.email).toBe('ann@example.ie');
  });

  it('rejects bad emails and defaults consent to false', () => {
    expect(emailSchema.safeParse({ email: 'not-an-email', query }).success).toBe(false);
    const parsed = emailSchema.safeParse({ email: 'ann@example.ie', query });
    expect(parsed.success && parsed.data.marketingConsent).toBe(false);
  });
});
