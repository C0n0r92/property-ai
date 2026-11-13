/**
 * Results of `SALES_FILE=<export of the sales table> node scripts/backtest-real-price.mjs 2025 3`,
 * last run on 13 Nov 2026 against the database (47,799 usable sales).
 * Re-run the script and update these figures whenever the sales data or the
 * model changes: the page quotes them to visitors.
 */
export const BACKTEST = {
  testYear: 2025,
  salesTested: 3263,
  insideFullRangePct: 78,
  insideLikelyRangePct: 50,
  medianErrorModelPct: 4.8,
  medianErrorAskingPct: 7.8,
} as const;
