/**
 * What the free page is allowed to see.
 *
 * The full analysis stays on the server for the paid report. The public
 * version keeps the headline answer and the chart, shows only the first few
 * comparable sales, and leaves out the upper bid levels, the bid ladder and
 * the budget plan.
 */

import type { ComparableSale, RealPriceResult } from './model';

export const FREE_SALES = 3;

export interface PublicResult {
  tier: RealPriceResult['tier'];
  prediction: {
    likelyLow: number;
    mid: number;
    medianOverAskingPct: number;
    shareAboveAsking: number;
  };
  /** Euro between the even-odds bid and the rarely-beaten bid, to the nearest €1,000. */
  gapToRarelyBeaten: number;
  dots: RealPriceResult['dots'];
  evidence: {
    count: number;
    from: string;
    to: string;
    recent: ComparableSale[];
  };
  /** Comparable sales held back for the report. */
  lockedSales: number;
}

export function toPublicResult(full: RealPriceResult): PublicResult {
  const { prediction, evidence } = full;
  return {
    tier: full.tier,
    prediction: {
      likelyLow: prediction.likelyLow,
      mid: prediction.mid,
      medianOverAskingPct: prediction.medianOverAskingPct,
      shareAboveAsking: prediction.shareAboveAsking,
    },
    gapToRarelyBeaten: Math.round((prediction.high - prediction.mid) / 1000) * 1000,
    dots: full.dots,
    evidence: {
      count: evidence.count,
      from: evidence.from,
      to: evidence.to,
      recent: evidence.recent.slice(0, FREE_SALES),
    },
    lockedSales: Math.max(0, evidence.count - FREE_SALES),
  };
}
