import type { ScrapedProperty } from './types.js';

/**
 * Parse a property card element from Daft's sold section
 * 
 * Expected data attributes:
 * - data-testid="card-container" - The card wrapper
 * - data-tracking="srp_address" - Address text
 * - data-tracking="srp_price" - Price info (both asking and sold)
 * - data-tracking="srp_meta" - Meta info (beds, baths, area, type)
 */

// Parse price string like "€590,000" to number
export function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;
  // Remove € symbol, commas, and any whitespace
  const cleaned = priceStr.replace(/[€,\s]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

// Parse date string like "SOLD 02/12/2025" to ISO date
export function parseSoldDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  // Extract date from "SOLD DD/MM/YYYY" format
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return new Date().toISOString().split('T')[0];
  
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

// Parse floor area like "127.6 m²" to number
export function parseFloorArea(areaStr: string): number | undefined {
  if (!areaStr) return undefined;
  const match = areaStr.match(/([\d.]+)\s*m²/);
  if (!match) return undefined;
  return parseFloat(match[1]);
}

// Parse bedrooms/bathrooms like "4 Bed" or "4 Bath" to number
export function parseBedBath(str: string): number | undefined {
  if (!str) return undefined;
  const match = str.match(/(\d+)/);
  if (!match) return undefined;
  return parseInt(match[1], 10);
}

// Parse BER rating from class name like "ber_B2_large" to "B2"
export function parseBerRating(berStr: string): string | undefined {
  if (!berStr) return undefined;
  // Match patterns like "ber_B2_large", "ber_A3_large", etc.
  const match = berStr.match(/ber_([A-G]\d?)_/i);
  if (!match) {
    // Also try just "B2", "A3" etc.
    const directMatch = berStr.match(/^([A-G]\d?)$/i);
    if (directMatch) return directMatch[1].toUpperCase();
    return undefined;
  }
  return match[1].toUpperCase();
}

// Extract area/neighborhood from address
export function extractArea(address: string): string | undefined {
  if (!address) return undefined;
  
  // Common Dublin area patterns
  const parts = address.split(',').map(p => p.trim());
  
  // Usually the second-to-last part is the area
  if (parts.length >= 2) {
    const area = parts[parts.length - 2];
    // Clean up "Dublin X" patterns
    if (area.match(/Dublin\s*\d+/i)) {
      return area;
    }
    return area;
  }
  
  return undefined;
}

// Extract county from address (usually last part)
export function extractCounty(address: string): string {
  if (!address) return 'Dublin';
  
  const parts = address.split(',').map(p => p.trim());
  const lastPart = parts[parts.length - 1];
  
  // Check if it's a Dublin postal code
  if (lastPart.match(/Dublin\s*\d*/i)) {
    return 'Dublin';
  }
  
  return lastPart || 'Dublin';
}

// Main parser function that takes raw scraped data and returns structured property
export function parsePropertyCard(data: {
  url: string;
  address: string;
  priceText: string; // e.g., "Sold: €590,000 Asking: €595,000"
  soldDateText: string; // e.g., "SOLD 02/12/2025"
  metaTexts: string[]; // e.g., ["4 Bed", "4 Bath", "127.6 m²", "Semi-D"]
  berRating?: string;
  agent?: string;
}): ScrapedProperty | null {
  try {
    // Parse prices from combined text
    // Format: "Sold: €590,000 Asking: €595,000"
    const soldMatch = data.priceText.match(/Sold:\s*€?([\d,]+)/i);
    const askingMatch = data.priceText.match(/Asking:\s*€?([\d,]+)/i);
    
    const soldPrice = soldMatch ? parsePrice(soldMatch[1]) : 0;
    const askingPrice = askingMatch ? parsePrice(askingMatch[1]) : 0;
    
    if (soldPrice === 0 || askingPrice === 0) {
      console.warn(`Could not parse prices from: "${data.priceText}"`);
      return null;
    }
    
    // Calculate over/under asking percentage
    const overUnderAskingPercent = ((soldPrice - askingPrice) / askingPrice) * 100;
    
    // Parse meta information
    let bedrooms: number | undefined;
    let bathrooms: number | undefined;
    let floorArea: number | undefined;
    let propertyType: string | undefined;
    
    for (const meta of data.metaTexts) {
      if (meta.toLowerCase().includes('bed')) {
        bedrooms = parseBedBath(meta);
      } else if (meta.toLowerCase().includes('bath')) {
        bathrooms = parseBedBath(meta);
      } else if (meta.includes('m²')) {
        floorArea = parseFloorArea(meta);
      } else if (meta.match(/semi-d|detached|apartment|terrace|bungalow|duplex|townhouse|end of terrace|site/i)) {
        propertyType = meta;
      }
    }
    
    return {
      daftUrl: data.url,
      address: data.address,
      area: extractArea(data.address),
      county: extractCounty(data.address),
      askingPrice,
      soldPrice,
      soldDate: parseSoldDate(data.soldDateText),
      propertyType,
      bedrooms,
      bathrooms,
      floorArea,
      berRating: data.berRating ? parseBerRating(data.berRating) : undefined,
      agent: data.agent,
      overUnderAskingPercent: Math.round(overUnderAskingPercent * 100) / 100,
      scrapedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error parsing property card:', error);
    return null;
  }
}






