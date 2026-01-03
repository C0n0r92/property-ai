import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extract Dublin postcode from address string
 * @param address - The address string to parse
 * @returns The Dublin postcode (e.g., "D4", "D6W") or null if not found
 */
export const extractDublinPostcode = (address: string): string | null => {
  // Look for patterns like "Dublin 4", "D4", "Dublin 6W", etc.
  const dublinMatch = address.match(/Dublin\s+(\d+[A-Z]*)/i) || address.match(/D(\d+[A-Z]*)/i);
  if (dublinMatch) {
    const code = dublinMatch[1].toUpperCase();
    return code.startsWith('D') ? code : `D${code}`;
  }
  return null;
};















