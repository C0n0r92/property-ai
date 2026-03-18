/**
 * Shared formatting utilities
 */

// Memoized formatter instances for better performance
const priceFormatter = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// Compact formatter - kept for potential future use
// const compactPriceFormatter = new Intl.NumberFormat('en-IE', {
//   style: 'currency',
//   currency: 'EUR',
//   notation: 'compact',
//   minimumFractionDigits: 0,
//   maximumFractionDigits: 1,
// });

/**
 * Format a price in EUR with no decimals
 * e.g., 450000 -> "€450,000"
 */
export function formatPrice(price: number): string {
  return priceFormatter.format(price);
}

/**
 * Format a price in compact notation
 * e.g., 450000 -> "€450K", 1200000 -> "€1.2M"
 */
export function formatPriceCompact(price: number): string {
  if (price >= 1000000) {
    return `€${(price / 1000000).toFixed(2)}M`;
  }
  return `€${Math.round(price / 1000)}K`;
}

/**
 * Format a date string to locale format
 */
export function formatDate(dateStr: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString('en-IE', options || {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format distance in km or meters
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

/**
 * Format a percentage with sign
 */
export function formatPercent(value: number, decimals: number = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}
