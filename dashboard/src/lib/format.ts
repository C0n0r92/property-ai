/**
 * Client-safe formatting utilities
 */

/**
 * Format price for display (short form)
 */
export function formatPrice(price: number | undefined | null): string {
  if (price == null || isNaN(price)) {
    return 'TBC';
  }
  if (price >= 1000000) {
    return `€${(price / 1000000).toFixed(2)}M`;
  }
  return `€${(price / 1000).toFixed(0)}k`;
}

/**
 * Format full price with commas
 */
export function formatFullPrice(price: number | undefined | null): string {
  if (price == null || isNaN(price)) {
    return 'TBC';
  }
  return `€${price.toLocaleString()}`;
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IE', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
}

/**
 * Format percentage with sign
 */
export function formatPercent(value: number | undefined | null): string {
  if (value == null || isNaN(value)) {
    return 'TBC';
  }
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}















