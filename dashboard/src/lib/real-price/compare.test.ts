import { describe, expect, it } from 'vitest';
import { decodeHome, encodeHome, verdict, type CompareResult } from './compare';

describe('home in the page address', () => {
  it('round-trips', () => {
    const home = { areaKey: 'd6w', typeGroup: 'semi' as const, beds: 3, askingPrice: 595_000 };
    expect(encodeHome(home)).toBe('d6w.semi.3.595000');
    expect(decodeHome(encodeHome(home))).toEqual(home);
  });

  it('rejects anything malformed or out of range', () => {
    expect(decodeHome(null)).toBeNull();
    expect(decodeHome('d8.castle.3.400000')).toBeNull();
    expect(decodeHome('d8.terr.0.400000')).toBeNull();
    expect(decodeHome('d8.terr.3.1000')).toBeNull();
    expect(decodeHome('D8;DROP.terr.3.400000')).toBeNull();
    expect(decodeHome('d8.terr.3')).toBeNull();
  });
});

const result = (asking: number, mid: number, over: number): CompareResult => ({
  label: 'x',
  asking,
  mid,
  likelyLow: mid - 20_000,
  medianOverAskingPct: over,
  shareAbove: 0.8,
  count: 40,
});

describe('verdict', () => {
  it('says so when the cheaper asking price turns out dearer', () => {
    const [first] = verdict(result(450_000, 520_000, 15), result(475_000, 490_000, 3));
    expect(first).toBe('Home A asks less, but Home B will likely cost less: about €30,000 less once the bidding is done.');
  });

  it('plain difference when the order holds', () => {
    const [first] = verdict(result(400_000, 430_000, 7), result(500_000, 540_000, 8));
    expect(first).toBe('Home B will likely cost about €110,000 more than Home A.');
  });

  it('about the same within €10k', () => {
    const [first] = verdict(result(400_000, 440_000, 10), result(420_000, 445_000, 6));
    expect(first).toMatch(/about the same/);
  });

  it('names the home that bids harder', () => {
    const lines = verdict(result(450_000, 520_000, 15), result(475_000, 490_000, 3), ['Rialto', 'Drimnagh']);
    expect(lines[1]).toBe('Homes like Rialto bid harder: expect to pay around €70,000 over its asking price, against less for Drimnagh.');
  });

  it('similar bidding', () => {
    expect(verdict(result(400_000, 430_000, 7.5), result(500_000, 540_000, 8))[1]).toMatch(/about as hard/);
  });
});
