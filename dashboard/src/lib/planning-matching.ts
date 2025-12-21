import { PlanningApplication, PlanningApplicationWithScore } from '@/types/property';

/**
 * Confidence-based matching algorithm for planning applications
 * Scores applications based on spatial proximity, address matching, and other factors
 */

export interface MatchingContext {
  propertyAddress: string;
  dublinPostcode?: string;
  searchRadius: 50 | 100 | 150;
}

/**
 * Score a planning application against a property address
 * Returns confidence level and reasons for the score
 */
export function scorePlanningApplication(
  application: PlanningApplication,
  context: MatchingContext
): PlanningApplicationWithScore {
  let score = 0;
  const reasons: string[] = [];

  // 1. Spatial proximity (baseline from search radius)
  if (context.searchRadius === 30) {
    score += 3;
    reasons.push('Within 30m radius');
  } else if (context.searchRadius === 75) {
    score += 2;
    reasons.push('Within 75m radius');
  } else if (context.searchRadius === 150) {
    score += 1;
    reasons.push('Within 150m radius');
  }

  // 2. House number matching (+3 points)
  const propertyNumber = extractHouseNumber(context.propertyAddress);
  const applicationAddress = application.DevelopmentAddress || '';

  if (propertyNumber) {
    const applicationNumbers = extractAllNumbers(applicationAddress);

    // Exact match gets full points
    if (applicationNumbers.includes(propertyNumber)) {
      score += 3;
      reasons.push(`House number match: ${propertyNumber}`);
    } else {
      // Check for ranges (e.g., "123-125" contains "124")
      const rangeMatch = checkNumberInRange(propertyNumber, applicationAddress);
      if (rangeMatch) {
        score += 3;
        reasons.push(`House number in range: ${rangeMatch}`);
      }
    }
  }

  // 3. Street name similarity (+2 points)
  const propertyStreet = extractStreetName(context.propertyAddress);
  const applicationStreet = extractStreetName(applicationAddress);

  if (propertyStreet && applicationStreet) {
    const similarity = calculateStreetSimilarity(propertyStreet, applicationStreet);
    if (similarity >= 0.8) {
      score += 2;
      reasons.push('Street name match');
    }
  }

  // 4. Postcode matching (rare but valuable, +1 point)
  if (context.dublinPostcode && application.DevelopmentPostcode) {
    const normalizedPropertyPostcode = normalizeDublinPostcode(context.dublinPostcode);
    const normalizedAppPostcode = normalizeDublinPostcode(application.DevelopmentPostcode);

    if (normalizedPropertyPostcode && normalizedAppPostcode &&
        normalizedPropertyPostcode === normalizedAppPostcode) {
      score += 1;
      reasons.push('Postcode match');
    }
  }

  // Determine confidence level
  let confidence: 'high' | 'medium' | 'low';
  if (score >= 6) {
    confidence = 'high';
  } else if (score >= 4) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    application,
    confidence,
    score,
    matchReasons: reasons
  };
}

/**
 * Extract house number from address string
 * Examples: "123 Main St" -> "123", "Apt 5, 456 Oak Ave" -> "456"
 */
function extractHouseNumber(address: string): string | null {
  if (!address) return null;

  // Match leading digits, optionally followed by a letter (e.g., "123A")
  const match = address.match(/^\s*(\d+[a-zA-Z]?)/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Extract all numbers from an address (for range checking)
 */
function extractAllNumbers(address: string): string[] {
  const matches = address.match(/\d+[a-zA-Z]?/g);
  return matches ? matches.map(m => m.toLowerCase()) : [];
}

/**
 * Check if a house number falls within a range in the address
 * Examples: "123-125 Main St" contains "124"
 */
function checkNumberInRange(targetNumber: string, address: string): string | null {
  // Look for patterns like "123-125", "123 to 125", "123/125"
  const rangePatterns = [
    /(\d+)[-\s](\d+)/,  // 123-125 or 123 125
    /(\d+)\s*to\s*(\d+)/i,  // 123 to 125
    /(\d+)\/(\d+)/  // 123/125
  ];

  const targetNum = parseInt(targetNumber);

  for (const pattern of rangePatterns) {
    const match = address.match(pattern);
    if (match) {
      const start = parseInt(match[1]);
      const end = parseInt(match[2]);

      if (targetNum >= Math.min(start, end) && targetNum <= Math.max(start, end)) {
        return `${start}-${end}`;
      }
    }
  }

  return null;
}

/**
 * Extract street name from address, removing house number and postcode
 */
function extractStreetName(address: string): string {
  if (!address) return '';

  // Remove house number from start
  let street = address.replace(/^\s*\d+[a-zA-Z]?\s*/, '').trim();

  // Remove Dublin and postcodes from the end
  street = street.replace(/\s*,?\s*(?:Dublin|Dublin\s+\d+[a-zA-Z]?|D\d+[a-zA-Z]?|Co\.?\s*Dublin|Dún\s+Laoghaire.*)$/i, '');

  // Split by comma and take the meaningful street part
  // For "Springfield, Blackhorse Avenue" -> keep "Blackhorse Avenue" if it looks like a street
  const parts = street.split(',').map(p => p.trim()).filter(p => p.length > 0);

  // Find the part that looks most like a street name (contains common street words)
  const streetIndicators = ['street', 'road', 'avenue', 'drive', 'lane', 'close', 'crescent', 'place', 'court'];
  for (const part of parts.reverse()) { // Check from end first
    if (streetIndicators.some(indicator => part.toLowerCase().includes(indicator))) {
      return part;
    }
  }

  // If no street indicators found, take the last meaningful part
  return parts[parts.length - 1] || street;
}

/**
 * Calculate similarity between two street names
 * Uses simple string matching with normalization
 */
function calculateStreetSimilarity(street1: string, street2: string): number {
  if (!street1 || !street2) return 0;

  // Normalize: lowercase, remove spaces, common abbreviations
  const normalize = (s: string) => s
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/street/g, 'st')
    .replace(/road/g, 'rd')
    .replace(/avenue/g, 'ave')
    .replace(/close/g, 'cl')
    .replace(/crescent/g, 'cres');

  const s1 = normalize(street1);
  const s2 = normalize(street2);

  if (s1 === s2) return 1.0;

  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;

  // Simple Levenshtein-like check (count matching characters)
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }

  return matches / longer.length;
}

/**
 * Normalize Dublin postcodes for comparison
 * Examples: "D7" -> "D07", "Dublin 7" -> "D07"
 */
function normalizeDublinPostcode(postcode: string): string | null {
  if (!postcode) return null;

  // Extract D followed by digits
  const match = postcode.match(/D(\d+)/i);
  if (!match) return null;

  const digits = match[1];
  // Pad single digits to 2 digits (D1 -> D01, D7 -> D07)
  return `D${digits.padStart(2, '0')}`;
}

/**
 * Group applications by confidence level
 */
export function groupApplicationsByConfidence(
  applications: PlanningApplicationWithScore[]
): {
  highConfidence: PlanningApplicationWithScore[];
  mediumConfidence: PlanningApplicationWithScore[];
  lowConfidence: PlanningApplicationWithScore[];
} {
  const high: PlanningApplicationWithScore[] = [];
  const medium: PlanningApplicationWithScore[] = [];
  const low: PlanningApplicationWithScore[] = [];

  for (const app of applications) {
    switch (app.confidence) {
      case 'high':
        high.push(app);
        break;
      case 'medium':
        medium.push(app);
        break;
      case 'low':
        low.push(app);
        break;
    }
  }

  return { highConfidence: high, mediumConfidence: medium, lowConfidence: low };
}

/**
 * Generate planning portal URL based on planning authority
 */
export function generatePlanningPortalUrl(authority: string, applicationNumber: string): string | null {
  const cleanNumber = applicationNumber.trim();

  // Dublin City Council - try direct application link first, fallback to search
  if (authority.toLowerCase().includes('dublin city')) {
    // Try direct link format (more specific)
    const directLink = `https://planning.agileapplications.ie/dublin/application/${cleanNumber}`;
    // For now, return search link as it's more reliable
    return `https://planning.agileapplications.ie/dublin/search?criteria=${encodeURIComponent(cleanNumber)}`;
  }

  // Fingal County Council
  if (authority.toLowerCase().includes('fingal')) {
    return `https://planning.agileapplications.ie/fingal/search?criteria=${encodeURIComponent(cleanNumber)}`;
  }

  // South Dublin County Council
  if (authority.toLowerCase().includes('south dublin')) {
    return `https://planning.agileapplications.ie/southdublin/search?criteria=${encodeURIComponent(cleanNumber)}`;
  }

  // Dún Laoghaire-Rathdown County Council
  if (authority.toLowerCase().includes('dún laoghaire') || authority.toLowerCase().includes('rathdown')) {
    return `https://planning.agileapplications.ie/dlrcoco/search?criteria=${encodeURIComponent(cleanNumber)}`;
  }

  // For other councils, try a generic search
  // This is a fallback - many councils have different systems
  return `https://www.google.com/search?q=${encodeURIComponent(`${authority} planning application ${cleanNumber}`)}`;
}

// Export utility functions for testing
export { extractHouseNumber, extractStreetName, calculateStreetSimilarity };

