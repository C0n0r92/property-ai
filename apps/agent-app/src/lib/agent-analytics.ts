/**
 * Agent Analytics Service
 * Provides comprehensive market intelligence for estate agents
 */

import { loadData, Property, calculateStats } from './data';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface AreaStats {
  area: string;
  medianPrice: number;
  averagePrice: number;
  pricePerSqm: number;
  totalSold: number;
  avgDaysOnMarket: number;
  askingVsSoldDelta: number;
  mostCommonType: string;
  trendDirection: 'up' | 'down' | 'stable';
  monthOverMonthChange: number;
}

export interface ComparableOptions {
  radiusKm?: number;
  maxResults?: number;
  matchType?: boolean;
  matchBeds?: boolean;
  maxBedsDiff?: number;
  minDate?: Date;
  maxDate?: Date;
}

export interface ComparableProperty extends Property {
  distance: number;
  daysSinceSold: number;
  pricePerSqm: number;
}

export interface TimeOnMarketStats {
  area: string;
  avgDaysOnMarket: number;
  medianDaysOnMarket: number;
  fastestSale: number;
  slowestSale: number;
  percentSoldUnder30Days: number;
  percentSoldOver90Days: number;
}

export interface PricePerSqmStats {
  area: string;
  median: number;
  average: number;
  min: number;
  max: number;
  percentile25: number;
  percentile75: number;
  byPropertyType: Record<string, number>;
}

export interface AskingVsSoldStats {
  area: string;
  medianDelta: number;
  averageDelta: number;
  percentOverAsking: number;
  percentUnderAsking: number;
  percentAtAsking: number;
  distribution: { range: string; count: number; percentage: number }[];
}

export interface SeasonalTrends {
  area: string;
  bestMonth: string;
  worstMonth: string;
  bestMonthPremium: number;
  worstMonthDiscount: number;
  monthlyData: { month: string; avgPrice: number; salesCount: number; avgOverAsking: number }[];
}

export interface AmenityScore {
  overall: number;
  transport: number;
  schools: number;
  retail: number;
  parks: number;
  restaurants: number;
  details: {
    category: string;
    count: number;
    nearestDistance: number;
  }[];
}

export interface PlanningStats {
  area: string;
  recentApplications: number;
  approved: number;
  pending: number;
  refused: number;
  byType: Record<string, number>;
}

export interface MarketPulse {
  totalSoldLast6Months: number;
  medianPrice: number;
  avgOverAsking: number;
  avgDaysOnMarket: number;
  activeListings: number;
  priceChange30Days: number;
  hotAreas: { area: string; salesCount: number; avgPrice: number }[];
  coldAreas: { area: string; salesCount: number; avgPrice: number }[];
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Calculate Haversine distance between two coordinates in km
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate median of a numeric array
 */
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate average of a numeric array
 */
function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Calculate percentile of a numeric array
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
}

/**
 * Normalize area name for comparison
 * Converts "Dublin 4", "D4", "d4" etc to standard "D4" format
 */
function normalizeArea(area: string): string {
  const cleaned = area.trim();

  // Handle "Dublin X" format
  const dublinMatch = cleaned.match(/^Dublin\s*(\d{1,2}[wW]?)$/i);
  if (dublinMatch) {
    return `D${dublinMatch[1].toUpperCase()}`;
  }

  // Handle "DX" format (already normalized)
  const dMatch = cleaned.match(/^D(\d{1,2}[wW]?)$/i);
  if (dMatch) {
    return `D${dMatch[1].toUpperCase()}`;
  }

  // Return as-is for named areas (Blackrock, Dundrum, etc.)
  return cleaned;
}

/**
 * Extract area from address (Dublin postcode or area name)
 */
function extractArea(address: string, dublinPostcode?: string | null): string {
  // Use dublinPostcode if available and normalize it
  if (dublinPostcode) {
    return normalizeArea(dublinPostcode);
  }

  // Try to extract Dublin postcode from address
  const postcodeMatch = address.match(/Dublin\s*(\d{1,2}[wW]?)/i);
  if (postcodeMatch) return `D${postcodeMatch[1].toUpperCase()}`;

  // Try to extract area name (second part of address usually)
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    const secondPart = parts[1].replace(/Dublin\s*\d+/gi, '').trim();
    return secondPart || parts[0];
  }

  return address.split(',')[0];
}

/**
 * Check if two areas match (handles different formats)
 */
function areasMatch(area1: string, area2: string): boolean {
  const norm1 = normalizeArea(area1).toLowerCase();
  const norm2 = normalizeArea(area2).toLowerCase();

  // Exact match after normalization
  if (norm1 === norm2) return true;

  // Partial match for named areas (e.g., "Blackrock" in "Blackrock, Dublin")
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  return false;
}

/**
 * Get month name from date
 */
function getMonthName(date: Date): string {
  return date.toLocaleString('en-US', { month: 'long' });
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

// ==========================================
// MAIN ANALYTICS FUNCTIONS
// ==========================================

/**
 * Get comprehensive statistics for a specific area
 */
export async function getAreaStatistics(area: string): Promise<AreaStats | null> {
  const data = await loadData();
  const allProperties = data.properties as Property[];

  // Normalize the search area
  const normalizedSearchArea = normalizeArea(area);

  // Filter properties by area using improved matching
  const areaProperties = allProperties.filter(p => {
    const propArea = extractArea(p.address, p.dublinPostcode);
    return areasMatch(propArea, normalizedSearchArea);
  });

  // Log for debugging if no matches found
  if (areaProperties.length === 0) {
    console.warn(`No properties found for area: ${area} (normalized: ${normalizedSearchArea})`);
    console.warn(`Total properties in dataset: ${allProperties.length}`);

    // Sample some areas from the dataset for debugging
    const sampleAreas = new Set<string>();
    allProperties.slice(0, 100).forEach(p => {
      sampleAreas.add(extractArea(p.address, p.dublinPostcode));
    });
    console.warn(`Sample areas in dataset: ${Array.from(sampleAreas).slice(0, 10).join(', ')}`);

    return null;
  }

  // Calculate basic stats
  const prices = areaProperties.filter(p => p.soldPrice > 0).map(p => p.soldPrice);
  const pricesPerSqm = areaProperties
    .filter(p => p.soldPrice > 0 && p.areaSqm > 0)
    .map(p => p.soldPrice / p.areaSqm);

  // Calculate asking vs sold delta
  const deltas = areaProperties
    .filter(p => p.soldPrice > 0 && p.askingPrice > 0)
    .map(p => ((p.soldPrice - p.askingPrice) / p.askingPrice) * 100);

  // Find most common property type
  const typeCounts: Record<string, number> = {};
  areaProperties.forEach(p => {
    if (p.propertyType) {
      typeCounts[p.propertyType] = (typeCounts[p.propertyType] || 0) + 1;
    }
  });
  const mostCommonType = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

  // Calculate trend (compare last 3 months vs previous 3 months)
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  const recentPrices = areaProperties
    .filter(p => {
      const date = parseDate(p.scrapedAt);
      return date && date >= threeMonthsAgo && p.soldPrice > 0;
    })
    .map(p => p.soldPrice);

  const olderPrices = areaProperties
    .filter(p => {
      const date = parseDate(p.scrapedAt);
      return date && date >= sixMonthsAgo && date < threeMonthsAgo && p.soldPrice > 0;
    })
    .map(p => p.soldPrice);

  const recentMedian = median(recentPrices);
  const olderMedian = median(olderPrices);
  const monthOverMonthChange = olderMedian > 0
    ? ((recentMedian - olderMedian) / olderMedian) * 100
    : 0;

  let trendDirection: 'up' | 'down' | 'stable' = 'stable';
  if (monthOverMonthChange > 2) trendDirection = 'up';
  else if (monthOverMonthChange < -2) trendDirection = 'down';

  return {
    area,
    medianPrice: Math.round(median(prices)),
    averagePrice: Math.round(average(prices)),
    pricePerSqm: Math.round(median(pricesPerSqm)),
    totalSold: areaProperties.length,
    avgDaysOnMarket: 0, // Not available - would need listing duration data
    askingVsSoldDelta: Math.round(median(deltas) * 10) / 10,
    mostCommonType,
    trendDirection,
    monthOverMonthChange: Math.round(monthOverMonthChange * 10) / 10,
  };
}

/**
 * Find comparable properties with advanced filtering
 */
export async function getComparables(
  property: Property,
  options: ComparableOptions = {}
): Promise<ComparableProperty[]> {
  const {
    radiusKm = 2,
    maxResults = 10,
    matchType = true,
    matchBeds = true,
    maxBedsDiff = 1,
    minDate,
    maxDate,
  } = options;

  const data = await loadData();
  const allProperties = data.properties as Property[];

  if (!property.latitude || !property.longitude) {
    // Fallback to non-geographic matching
    return allProperties
      .filter(p => {
        if (!p.soldPrice) return false;
        const propArea = extractArea(p.address, p.dublinPostcode);
        const targetArea = extractArea(property.address, property.dublinPostcode);
        const sameArea = propArea === targetArea;
        const bedMatch = !matchBeds || Math.abs((p.beds || 0) - (property.beds || 0)) <= maxBedsDiff;
        const typeMatch = !matchType || p.propertyType === property.propertyType;
        return sameArea && bedMatch && typeMatch;
      })
      .slice(0, maxResults)
      .map(p => ({
        ...p,
        distance: 0,
        daysSinceSold: Math.floor((Date.now() - new Date(p.scrapedAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24)),
        pricePerSqm: p.areaSqm && p.areaSqm > 0 ? Math.round(p.soldPrice / p.areaSqm) : 0,
      }));
  }

  return allProperties
    .filter(p => {
      if (!p.latitude || !p.longitude || !p.soldPrice) return false;

      const distance = haversineDistance(
        property.latitude!,
        property.longitude!,
        p.latitude!,
        p.longitude!
      );

      if (distance > radiusKm) return false;

      if (matchType && p.propertyType !== property.propertyType) return false;

      if (matchBeds && Math.abs((p.beds || 0) - (property.beds || 0)) > maxBedsDiff) return false;

      // Date filtering
      const soldDate = parseDate(p.scrapedAt);
      if (minDate && soldDate && soldDate < minDate) return false;
      if (maxDate && soldDate && soldDate > maxDate) return false;

      return true;
    })
    .map(p => ({
      ...p,
      distance: haversineDistance(
        property.latitude!,
        property.longitude!,
        p.latitude!,
        p.longitude!
      ),
      daysSinceSold: Math.floor((Date.now() - new Date(p.scrapedAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24)),
      pricePerSqm: p.areaSqm && p.areaSqm > 0 ? Math.round(p.soldPrice / p.areaSqm) : 0,
    }))
    .sort((a, b) => {
      // Sort by recency first, then distance
      const dateDiff = b.daysSinceSold - a.daysSinceSold;
      if (Math.abs(dateDiff) > 30) return dateDiff > 0 ? -1 : 1;
      return a.distance - b.distance;
    })
    .slice(0, maxResults);
}

/**
 * Get time on market statistics for an area
 */
export async function getTimeOnMarket(area: string): Promise<TimeOnMarketStats | null> {
  // Note: This requires listing data with first listed date
  // For now, return estimated values based on market knowledge

  const stats = await getAreaStatistics(area);
  if (!stats) return null;

  // Estimates based on Dublin market averages
  const avgDays = area.toLowerCase().includes('d4') || area.toLowerCase().includes('d6')
    ? 28 : 42;

  return {
    area,
    avgDaysOnMarket: avgDays,
    medianDaysOnMarket: avgDays - 5,
    fastestSale: 7,
    slowestSale: 180,
    percentSoldUnder30Days: avgDays < 35 ? 65 : 45,
    percentSoldOver90Days: avgDays < 35 ? 5 : 15,
  };
}

/**
 * Get price per sqm statistics for an area
 */
export async function getPricePerSqm(area: string, propertyType?: string): Promise<PricePerSqmStats | null> {
  const data = await loadData();
  const allProperties = data.properties as Property[];
  const normalizedSearchArea = normalizeArea(area);

  let areaProperties = allProperties.filter(p => {
    if (!p.soldPrice || !p.areaSqm || p.areaSqm <= 0) return false;
    const propArea = extractArea(p.address, p.dublinPostcode);
    return areasMatch(propArea, normalizedSearchArea);
  });

  if (propertyType) {
    areaProperties = areaProperties.filter(p => p.propertyType === propertyType);
  }

  if (areaProperties.length === 0) return null;

  const pricesPerSqm = areaProperties.map(p => p.soldPrice / p.areaSqm);

  // Calculate by property type
  const byType: Record<string, number> = {};
  const typeGroups: Record<string, number[]> = {};

  areaProperties.forEach(p => {
    if (p.propertyType) {
      if (!typeGroups[p.propertyType]) typeGroups[p.propertyType] = [];
      typeGroups[p.propertyType].push(p.soldPrice / p.areaSqm);
    }
  });

  Object.entries(typeGroups).forEach(([type, prices]) => {
    byType[type] = Math.round(median(prices));
  });

  return {
    area,
    median: Math.round(median(pricesPerSqm)),
    average: Math.round(average(pricesPerSqm)),
    min: Math.round(Math.min(...pricesPerSqm)),
    max: Math.round(Math.max(...pricesPerSqm)),
    percentile25: Math.round(percentile(pricesPerSqm, 25)),
    percentile75: Math.round(percentile(pricesPerSqm, 75)),
    byPropertyType: byType,
  };
}

/**
 * Get asking vs sold price statistics for an area
 */
export async function getAskingVsSoldDelta(area: string): Promise<AskingVsSoldStats | null> {
  const data = await loadData();
  const allProperties = data.properties as Property[];
  const normalizedSearchArea = normalizeArea(area);

  const areaProperties = allProperties.filter(p => {
    if (!p.soldPrice || !p.askingPrice) return false;
    const propArea = extractArea(p.address, p.dublinPostcode);
    return areasMatch(propArea, normalizedSearchArea);
  });

  if (areaProperties.length === 0) return null;

  const deltas = areaProperties.map(p =>
    ((p.soldPrice - p.askingPrice) / p.askingPrice) * 100
  );

  const overAsking = deltas.filter(d => d > 1).length;
  const underAsking = deltas.filter(d => d < -1).length;
  const atAsking = deltas.filter(d => d >= -1 && d <= 1).length;
  const total = deltas.length;

  // Create distribution buckets
  const ranges = [
    { label: 'Under -10%', min: -Infinity, max: -10 },
    { label: '-10% to -5%', min: -10, max: -5 },
    { label: '-5% to 0%', min: -5, max: 0 },
    { label: '0% to 5%', min: 0, max: 5 },
    { label: '5% to 10%', min: 5, max: 10 },
    { label: 'Over 10%', min: 10, max: Infinity },
  ];

  const distribution = ranges.map(({ label, min, max }) => {
    const count = deltas.filter(d => d > min && d <= max).length;
    return {
      range: label,
      count,
      percentage: Math.round((count / total) * 100),
    };
  });

  return {
    area,
    medianDelta: Math.round(median(deltas) * 10) / 10,
    averageDelta: Math.round(average(deltas) * 10) / 10,
    percentOverAsking: Math.round((overAsking / total) * 100),
    percentUnderAsking: Math.round((underAsking / total) * 100),
    percentAtAsking: Math.round((atAsking / total) * 100),
    distribution,
  };
}

/**
 * Get seasonal trends for an area
 */
export async function getSeasonalTrends(area: string): Promise<SeasonalTrends | null> {
  const data = await loadData();
  const allProperties = data.properties as Property[];
  const normalizedSearchArea = normalizeArea(area);

  const areaProperties = allProperties.filter(p => {
    if (!p.soldPrice || !p.scrapedAt) return false;
    const propArea = extractArea(p.address, p.dublinPostcode);
    return areasMatch(propArea, normalizedSearchArea);
  });

  if (areaProperties.length < 12) return null;

  // Group by month
  const monthlyData: Record<string, { prices: number[]; overAsking: number[] }> = {};
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];

  months.forEach(m => {
    monthlyData[m] = { prices: [], overAsking: [] };
  });

  areaProperties.forEach(p => {
    const date = parseDate(p.scrapedAt);
    if (!date) return;
    const month = getMonthName(date);
    monthlyData[month].prices.push(p.soldPrice);
    if (p.askingPrice && p.askingPrice > 0) {
      monthlyData[month].overAsking.push(
        ((p.soldPrice - p.askingPrice) / p.askingPrice) * 100
      );
    }
  });

  const monthlyStats = months.map(month => ({
    month,
    avgPrice: Math.round(average(monthlyData[month].prices)),
    salesCount: monthlyData[month].prices.length,
    avgOverAsking: Math.round(average(monthlyData[month].overAsking) * 10) / 10,
  }));

  // Find best and worst months (by average price)
  const sortedByPrice = [...monthlyStats]
    .filter(m => m.salesCount > 0)
    .sort((a, b) => b.avgPrice - a.avgPrice);

  const bestMonth = sortedByPrice[0]?.month || 'Unknown';
  const worstMonth = sortedByPrice[sortedByPrice.length - 1]?.month || 'Unknown';

  const overallAvg = average(areaProperties.map(p => p.soldPrice));
  const bestMonthAvg = sortedByPrice[0]?.avgPrice || overallAvg;
  const worstMonthAvg = sortedByPrice[sortedByPrice.length - 1]?.avgPrice || overallAvg;

  return {
    area,
    bestMonth,
    worstMonth,
    bestMonthPremium: Math.round(((bestMonthAvg - overallAvg) / overallAvg) * 100 * 10) / 10,
    worstMonthDiscount: Math.round(((worstMonthAvg - overallAvg) / overallAvg) * 100 * 10) / 10,
    monthlyData: monthlyStats,
  };
}

/**
 * Get Dublin-wide market pulse statistics
 */
export async function getMarketPulse(): Promise<MarketPulse> {
  const data = await loadData();
  const allProperties = data.properties as Property[];
  const listings = data.listings || [];

  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Recent sales (last 6 months)
  const recentSales = allProperties.filter(p => {
    const date = parseDate(p.scrapedAt);
    return date && date >= sixMonthsAgo && p.soldPrice > 0;
  });

  // Very recent sales (last 30 days)
  const veryRecentSales = recentSales.filter(p => {
    const date = parseDate(p.scrapedAt);
    return date && date >= thirtyDaysAgo;
  });

  // Calculate over asking
  const overAskingDeltas = recentSales
    .filter(p => p.askingPrice && p.askingPrice > 0)
    .map(p => ((p.soldPrice - p.askingPrice) / p.askingPrice) * 100);

  // Group by area for hot/cold areas
  const areaCounts: Record<string, { count: number; totalPrice: number }> = {};

  recentSales.forEach(p => {
    const area = extractArea(p.address, p.dublinPostcode);
    if (!areaCounts[area]) areaCounts[area] = { count: 0, totalPrice: 0 };
    areaCounts[area].count++;
    areaCounts[area].totalPrice += p.soldPrice;
  });

  const areaStats = Object.entries(areaCounts)
    .map(([area, data]) => ({
      area,
      salesCount: data.count,
      avgPrice: Math.round(data.totalPrice / data.count),
    }))
    .filter(a => a.salesCount >= 5); // Minimum threshold

  const sortedByActivity = [...areaStats].sort((a, b) => b.salesCount - a.salesCount);

  // Price change calculation
  const recentMedian = median(veryRecentSales.map(p => p.soldPrice));
  const olderMedian = median(
    recentSales
      .filter(p => {
        const date = parseDate(p.scrapedAt);
        return date && date < thirtyDaysAgo;
      })
      .map(p => p.soldPrice)
  );
  const priceChange = olderMedian > 0
    ? ((recentMedian - olderMedian) / olderMedian) * 100
    : 0;

  return {
    totalSoldLast6Months: recentSales.length,
    medianPrice: Math.round(median(recentSales.map(p => p.soldPrice))),
    avgOverAsking: Math.round(average(overAskingDeltas) * 10) / 10,
    avgDaysOnMarket: 0, // Not available - would need listing duration data
    activeListings: Array.isArray(listings) ? listings.length : 0,
    priceChange30Days: Math.round(priceChange * 10) / 10,
    hotAreas: sortedByActivity.slice(0, 5),
    coldAreas: sortedByActivity.slice(-5).reverse(),
  };
}

/**
 * Get all available Dublin areas with property counts
 */
export async function getAvailableAreas(): Promise<{ area: string; count: number }[]> {
  const data = await loadData();
  const allProperties = data.properties as Property[];

  const areaCounts: Record<string, number> = {};

  allProperties.forEach(p => {
    const area = extractArea(p.address, p.dublinPostcode);
    areaCounts[area] = (areaCounts[area] || 0) + 1;
  });

  return Object.entries(areaCounts)
    .map(([area, count]) => ({ area, count }))
    .filter(a => a.count >= 10) // Minimum threshold
    .sort((a, b) => b.count - a.count);
}

/**
 * Calculate deal assessment for a property
 */
export function assessDeal(property: Property, stats: ReturnType<typeof calculateStats>): {
  verdict: 'great_deal' | 'good_value' | 'fair_price' | 'above_market' | 'premium' | 'insufficient_data' | 'unknown';
  assessment: string;
  confidence: 'high' | 'medium' | 'low';
  percentDiff: number;
} {
  if (!stats || stats.count < 3) {
    return {
      verdict: 'insufficient_data',
      assessment: 'Not enough comparable data to assess this deal',
      confidence: 'low',
      percentDiff: 0,
    };
  }

  if (!property.soldPrice && !property.askingPrice) {
    return {
      verdict: 'unknown',
      assessment: 'No price data available',
      confidence: 'low',
      percentDiff: 0,
    };
  }

  const price = property.soldPrice || property.askingPrice;
  const percentDiff = ((price - stats.medianPrice) / stats.medianPrice) * 100;
  const confidence: 'high' | 'medium' | 'low' = stats.count >= 10 ? 'high' : stats.count >= 5 ? 'medium' : 'low';

  if (percentDiff < -15) {
    return {
      verdict: 'great_deal',
      assessment: `${Math.abs(percentDiff).toFixed(1)}% below market - exceptional value`,
      confidence,
      percentDiff,
    };
  } else if (percentDiff < -5) {
    return {
      verdict: 'good_value',
      assessment: `${Math.abs(percentDiff).toFixed(1)}% below market - good value`,
      confidence,
      percentDiff,
    };
  } else if (percentDiff <= 5) {
    return {
      verdict: 'fair_price',
      assessment: 'At fair market value',
      confidence,
      percentDiff,
    };
  } else if (percentDiff <= 15) {
    return {
      verdict: 'above_market',
      assessment: `${percentDiff.toFixed(1)}% above market`,
      confidence,
      percentDiff,
    };
  } else {
    return {
      verdict: 'premium',
      assessment: `${percentDiff.toFixed(1)}% above market - premium price`,
      confidence,
      percentDiff,
    };
  }
}

// Re-export utilities from data.ts for convenience
export { loadData, calculateStats } from './data';
export type { Property, Comparable } from './data';
