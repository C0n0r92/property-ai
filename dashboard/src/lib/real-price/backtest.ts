/**
 * Results of `SALES_FILE=<export of the sales table> node scripts/backtest-real-price.mjs 2025 3`,
 * last run on 13 Nov 2026 against the database (48,858 usable sales, after the
 * web-archive import).
 * Re-run the script and update these figures whenever the sales data or the
 * model changes: the page quotes them to visitors.
 */
export const BACKTEST = {
  testYear: 2025,
  salesTested: 3435,
  insideFullRangePct: 78,
  insideLikelyRangePct: 49,
  medianErrorModelPct: 5.0,
  medianErrorAskingPct: 7.8,
} as const;
