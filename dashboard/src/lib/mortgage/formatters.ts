/**
 * Mortgage Calculator Utility Functions
 * Number and currency formatting utilities
 */

import { CURRENCIES } from '@/types/mortgage';

/**
 * Format a number as currency
 * @param amount - Amount to format
 * @param currency - Currency code (default: EUR)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: 'EUR' = 'EUR', decimals: number = 0): string {
  const currencyInfo = CURRENCIES[currency];
  
  return `${currencyInfo.symbol}${amount.toLocaleString('en-IE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
}

/**
 * Format a full price with appropriate decimals
 * @param amount - Amount to format
 * @param currency - Currency code (default: EUR)
 * @returns Formatted price string with appropriate decimals
 */
export function formatFullPrice(amount: number, currency: 'EUR' = 'EUR'): string {
  return formatCurrency(amount, currency, 2);
}

/**
 * Format a number with commas and optional decimals
 * @param num - Number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string
 */
export function formatNumber(num: number, decimals: number = 0): string {
  return num.toLocaleString('en-IE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Format a percentage
 * @param value - Percentage value (e.g., 3.5 for 3.5%)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format months as years and months
 * @param months - Total number of months
 * @returns Formatted string like "25 years 3 months" or "3 months"
 */
export function formatMonthsAsYears(months: number): string {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (years === 0) {
    return `${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
  }
  
  if (remainingMonths === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`;
  }
  
  return `${years} year${years !== 1 ? 's' : ''} ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
}

/**
 * Format a short version of years/months
 * @param months - Total number of months
 * @returns Formatted string like "25y 3m"
 */
export function formatMonthsShort(months: number): string {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (years === 0) {
    return `${remainingMonths}m`;
  }
  
  if (remainingMonths === 0) {
    return `${years}y`;
  }
  
  return `${years}y ${remainingMonths}m`;
}

/**
 * Validate numeric input and return error message if invalid
 * @param field - Field name for error message
 * @param value - Value to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Error message or empty string if valid
 */
export function validateInput(
  field: string,
  value: number,
  min: number = 0,
  max: number = Infinity
): string {
  if (isNaN(value)) {
    return `${field} must be a valid number`;
  }
  
  if (value < min) {
    return `${field} must be at least ${min}`;
  }
  
  if (value > max) {
    return `${field} must be no more than ${max}`;
  }
  
  return '';
}

/**
 * Parse a currency string and return the numeric value
 * @param value - Currency string (e.g., "€350,000" or "350000")
 * @returns Numeric value
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols and commas
  const cleaned = value.replace(/[€$£,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format a date as a readable string
 * @param date - Date string or Date object
 * @returns Formatted date string
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format a date as ISO string for input fields
 * @param date - Date object
 * @returns ISO date string (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calculate age at a future date
 * @param currentAge - Current age
 * @param monthsInFuture - Months into the future
 * @returns Age at that future date
 */
export function calculateFutureAge(currentAge: number, monthsInFuture: number): number {
  return currentAge + Math.floor(monthsInFuture / 12);
}

/**
 * Abbreviate large numbers (e.g., 1000 -> 1K, 1000000 -> 1M)
 * @param num - Number to abbreviate
 * @returns Abbreviated string
 */
export function abbreviateNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

