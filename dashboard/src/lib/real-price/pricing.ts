/**
 * What the report costs.
 *
 * A launch price runs to the end of LAUNCH_ENDS (Dublin time) and the regular
 * price applies automatically after it, so "launch price until 31 December,
 * then €19" stays true without anyone changing the code. The page never shows
 * the regular price as a struck-out "was" price: it has not been charged yet,
 * and consumer law only allows a "was" price that was actually charged.
 */

export const REGULAR_PRICE_CENTS = 1900;
export const LAUNCH_PRICE_CENTS = 999;
/** The first moment of the regular price: 1 January 2027, 00:00 in Dublin (GMT in winter). */
const REGULAR_FROM = Date.parse('2027-01-01T00:00:00Z');
const LAUNCH_ENDS_LABEL = '31 December';

/** Days in which a buyer can ask for a full refund. */
export const REFUND_DAYS = 7;

export interface ReportPrice {
  cents: number;
  /** e.g. "€9.99", or "€19" for whole euro */
  label: string;
  isLaunch: boolean;
  regularLabel: string;
  launchEndsLabel: string;
}

export function euroLabel(cents: number): string {
  return cents % 100 === 0 ? `€${cents / 100}` : `€${(cents / 100).toFixed(2)}`;
}

export function reportPrice(now: number = Date.now()): ReportPrice {
  const isLaunch = now < REGULAR_FROM;
  const cents = isLaunch ? LAUNCH_PRICE_CENTS : REGULAR_PRICE_CENTS;
  return {
    cents,
    label: euroLabel(cents),
    isLaunch,
    regularLabel: euroLabel(REGULAR_PRICE_CENTS),
    launchEndsLabel: LAUNCH_ENDS_LABEL,
  };
}
