import {
  PlanningApplication,
  PlanningApplicationWithScore,
  PlanningInsight,
  PlanningWorkType,
  PropertyPlanningHistory,
} from '@/types/planning';
import { latLngToWebMercator } from './coordinates';

/**
 * Matching context for planning applications
 */
export interface MatchingContext {
  propertyAddress: string;
  dublinPostcode?: string;
  searchRadius: 50 | 100 | 150;
}

/**
 * Score a planning application against a property address
 */
export function scorePlanningApplication(
  application: PlanningApplication,
  context: MatchingContext
): PlanningApplicationWithScore {
  let score = 0;
  const reasons: string[] = [];

  // 1. Spatial proximity (baseline from search radius)
  if (context.searchRadius === 50) {
    score += 3;
    reasons.push('Within 50m radius');
  } else if (context.searchRadius === 100) {
    score += 2;
    reasons.push('Within 100m radius');
  } else if (context.searchRadius === 150) {
    score += 1;
    reasons.push('Within 150m radius');
  }

  // 2. House number matching (+3 points)
  const propertyNumber = extractHouseNumber(context.propertyAddress);
  const applicationAddress = application.DevelopmentAddress || '';

  if (propertyNumber) {
    const applicationNumbers = extractAllNumbers(applicationAddress);

    if (applicationNumbers.includes(propertyNumber)) {
      score += 3;
      reasons.push(`House number match: ${propertyNumber}`);
    } else {
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

  // 4. Postcode matching (+1 point)
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
 */
function extractHouseNumber(address: string): string | null {
  if (!address) return null;
  const match = address.match(/^\s*(\d+[a-zA-Z]?)/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Extract all numbers from an address
 */
function extractAllNumbers(address: string): string[] {
  const matches = address.match(/\d+[a-zA-Z]?/g);
  return matches ? matches.map(m => m.toLowerCase()) : [];
}

/**
 * Check if a house number falls within a range
 */
function checkNumberInRange(targetNumber: string, address: string): string | null {
  const rangePatterns = [
    /(\d+)[-\s](\d+)/,
    /(\d+)\s*to\s*(\d+)/i,
    /(\d+)\/(\d+)/
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
 * Extract street name from address
 */
function extractStreetName(address: string): string {
  if (!address) return '';

  let street = address.replace(/^\s*\d+[a-zA-Z]?\s*/, '').trim();
  street = street.replace(/\s*,?\s*(?:Dublin|Dublin\s+\d+[a-zA-Z]?|D\d+[a-zA-Z]?|Co\.?\s*Dublin|Dún\s+Laoghaire.*)$/i, '');

  const parts = street.split(',').map(p => p.trim()).filter(p => p.length > 0);
  const streetIndicators = ['street', 'road', 'avenue', 'drive', 'lane', 'close', 'crescent', 'place', 'court'];

  for (const part of parts.reverse()) {
    if (streetIndicators.some(indicator => part.toLowerCase().includes(indicator))) {
      return part;
    }
  }

  return parts[parts.length - 1] || street;
}

/**
 * Calculate similarity between two street names
 */
function calculateStreetSimilarity(street1: string, street2: string): number {
  if (!street1 || !street2) return 0;

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
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }

  return matches / longer.length;
}

/**
 * Normalize Dublin postcodes
 */
function normalizeDublinPostcode(postcode: string): string | null {
  if (!postcode) return null;
  const match = postcode.match(/D(\d+)/i);
  if (!match) return null;
  return `D${match[1].padStart(2, '0')}`;
}

/**
 * Detect work type from planning description
 */
export function detectWorkType(description: string): PlanningWorkType[] {
  const desc = description.toLowerCase();
  const types: PlanningWorkType[] = [];

  // Extension patterns
  if (/\b(single|two|2)\s*storey\s*(rear|side|front)?\s*extension\b/.test(desc) ||
      /\b(rear|side|front)\s*extension\b/.test(desc) ||
      /\bextension\s+to\s+(the\s+)?(rear|side|front)\b/.test(desc)) {
    types.push('extension');
  }

  // Attic conversion
  if (/\b(attic|loft|dormer|roof\s*space|mansard)\s*(conversion|room|bedroom)?\b/.test(desc) ||
      /\bconvert(ing)?\s+(the\s+)?attic\b/.test(desc)) {
    types.push('attic_conversion');
  }

  // Garage conversion
  if (/\bgarage\s*(to|into)?\s*(habitable|living|bedroom)\b/.test(desc) ||
      /\bconvert(ing)?\s+(the\s+)?garage\b/.test(desc)) {
    types.push('garage_conversion');
  }

  // Conservatory
  if (/\b(conservatory|sun\s*room)\b/.test(desc)) {
    types.push('conservatory');
  }

  // Renovation
  if (/\b(renovation|refurbishment|modernisation|refurbish)\b/.test(desc)) {
    types.push('renovation');
  }

  // New build
  if (/\b(new\s+dwelling|construction\s+of\s+(a\s+)?(new\s+)?house|new\s+house)\b/.test(desc)) {
    types.push('new_build');
  }

  // Garden room
  if (/\b(garden\s+room|home\s+office|outbuilding)\b/.test(desc)) {
    types.push('garden_room');
  }

  // Change of use
  if (/\bchange\s+of\s+use\b/.test(desc) ||
      /\bcommercial\s+to\s+residential\b/.test(desc)) {
    types.push('change_of_use');
  }

  return types.length > 0 ? types : ['other'];
}

/**
 * Fetch planning applications from ArcGIS
 */
export async function fetchPlanningApplications(
  lat: number,
  lng: number,
  radiusMeters: number = 150
): Promise<PlanningApplication[]> {
  const [x, y] = latLngToWebMercator(lat, lng);

  // ArcGIS FeatureServer endpoint for Irish planning applications
  const baseUrl = 'https://services.arcgis.com/NzlPQPKn5QF9v2US/arcgis/rest/services/IrishPlanningApplications/FeatureServer/0/query';

  const params = new URLSearchParams({
    geometry: `${Math.round(x)},${Math.round(y)}`,
    geometryType: 'esriGeometryPoint',
    spatialRel: 'esriSpatialRelIntersects',
    distance: radiusMeters.toString(),
    units: 'esriSRUnit_Meter',
    outFields: '*',
    returnGeometry: 'false',
    f: 'pjson',
  });

  const response = await fetch(`${baseUrl}?${params}`, {
    headers: {
      'User-Agent': 'GaffIntel/1.0',
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(10000), // 10 second timeout
  });

  if (!response.ok) {
    throw new Error(`ArcGIS API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.features || !Array.isArray(data.features)) {
    // No results or invalid response
    return [];
  }

  return data.features.map((f: { attributes: PlanningApplication }) => f.attributes);
}

/**
 * Calculate planning insights from applications
 */
export function calculatePlanningInsight(
  applications: PlanningApplicationWithScore[]
): PlanningInsight {
  const twoYearsAgo = Date.now() - (2 * 365 * 24 * 60 * 60 * 1000);

  // Recent approvals (granted in last 2 years)
  const recentApprovals = applications.filter(app => {
    const grantDate = app.application.GrantDate;
    const decision = app.application.Decision?.toLowerCase();
    return grantDate && grantDate > twoYearsAgo &&
           (decision?.includes('grant') || decision?.includes('approved'));
  }).length;

  // Pending applications
  const pendingApplications = applications.filter(app => {
    const status = app.application.ApplicationStatus?.toLowerCase();
    return status?.includes('pending') || status?.includes('lodged') ||
           status?.includes('received') || status?.includes('valid');
  }).length;

  // Large development nearby (10+ units)
  const largeDevNearby = applications.some(app =>
    (app.application.NumResidentialUnits || 0) >= 10
  );

  // Development trend (compare recent vs older applications)
  const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
  const recentYear = applications.filter(app =>
    app.application.ReceivedDate > oneYearAgo
  ).length;
  const previousYear = applications.filter(app =>
    app.application.ReceivedDate <= oneYearAgo &&
    app.application.ReceivedDate > twoYearsAgo
  ).length;

  let developmentTrend: 'increasing' | 'stable' | 'decreasing';
  if (recentYear > previousYear * 1.3) {
    developmentTrend = 'increasing';
  } else if (recentYear < previousYear * 0.7) {
    developmentTrend = 'decreasing';
  } else {
    developmentTrend = 'stable';
  }

  // Property history (high confidence matches)
  const propertyHistory = applications.filter(app => app.confidence === 'high');

  return {
    recentApprovals,
    pendingApplications,
    largeDevNearby,
    developmentTrend,
    propertyHistory,
  };
}

/**
 * Get property planning history
 */
export function getPropertyPlanningHistory(
  applications: PlanningApplicationWithScore[]
): PropertyPlanningHistory {
  const highConfidenceApprovals = applications.filter(app => {
    const decision = app.application.Decision?.toLowerCase();
    return app.confidence === 'high' &&
           (decision?.includes('grant') || decision?.includes('approved'));
  });

  if (highConfidenceApprovals.length === 0) {
    return {
      hasApprovedWork: false,
      workTypes: [],
      mostRecentApproval: null,
      totalApprovals: 0,
    };
  }

  // Get all work types
  const allWorkTypes = new Set<PlanningWorkType>();
  for (const app of highConfidenceApprovals) {
    const types = detectWorkType(app.application.DevelopmentDescription);
    types.forEach(t => allWorkTypes.add(t));
  }

  // Sort by grant date to find most recent
  const sorted = [...highConfidenceApprovals].sort((a, b) =>
    (b.application.GrantDate || 0) - (a.application.GrantDate || 0)
  );

  return {
    hasApprovedWork: true,
    workTypes: Array.from(allWorkTypes),
    mostRecentApproval: sorted[0].application,
    totalApprovals: highConfidenceApprovals.length,
  };
}

/**
 * Generate planning portal URL
 */
export function generatePlanningPortalUrl(authority: string, applicationNumber: string): string | null {
  const cleanNumber = applicationNumber.trim();

  if (authority.toLowerCase().includes('dublin city')) {
    return `https://planning.agileapplications.ie/dublin/search?criteria=${encodeURIComponent(cleanNumber)}`;
  }

  if (authority.toLowerCase().includes('fingal')) {
    return `https://planning.agileapplications.ie/fingal/search?criteria=${encodeURIComponent(cleanNumber)}`;
  }

  if (authority.toLowerCase().includes('south dublin')) {
    return `https://planning.agileapplications.ie/southdublin/search?criteria=${encodeURIComponent(cleanNumber)}`;
  }

  if (authority.toLowerCase().includes('dún laoghaire') || authority.toLowerCase().includes('rathdown')) {
    return `https://planning.agileapplications.ie/dlrcoco/search?criteria=${encodeURIComponent(cleanNumber)}`;
  }

  return `https://www.google.com/search?q=${encodeURIComponent(`${authority} planning application ${cleanNumber}`)}`;
}
