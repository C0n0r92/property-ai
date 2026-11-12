/**
 * Results of `node scripts/backtest-real-price.mjs 2025 3`.
 * Re-run the script and update these figures whenever the sales data or the
 * model changes: the page quotes them to visitors.
 */
export const BACKTEST = {
  testYear: 2025,
  salesTested: 3140,
  insideFullRangePct: 78,
  insideLikelyRangePct: 50,
  medianErrorModelPct: 4.9,
  medianErrorAskingPct: 7.9,
} as const;
