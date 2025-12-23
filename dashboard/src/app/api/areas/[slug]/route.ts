import { NextRequest, NextResponse } from 'next/server';
import { loadProperties } from '@/lib/data';
import { slugToArea, addressMatchesArea } from '@/lib/areas';
import type { Property } from '@/types/property';

/**
 * API endpoint for area-specific property data
 * GET /api/areas/dublin-4
 * GET /api/areas/ballsbridge
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  
  // Convert slug to area name
  const areaName = slugToArea(slug);
  
  if (!areaName) {
    return NextResponse.json(
      { error: 'Area not found' },
      { status: 404 }
    );
  }
  
  try {
    // Load all properties
    const allProperties = await loadProperties();
    
    // Filter to this specific area
    const areaProperties = allProperties.filter(p =>
      addressMatchesArea(p.address, areaName)
    );
    
    if (areaProperties.length === 0) {
      return NextResponse.json({
        area: areaName,
        slug,
        stats: null,
        recentSales: [],
        monthlyTrend: [],
        propertyTypes: [],
        message: 'No data available for this area',
      });
    }
    
    // Calculate stats
    const stats = calculateAreaStats(areaProperties);
    
    // Get recent sales (last 30, sorted by date)
    const recentSales = areaProperties
      .sort((a, b) => new Date(b.soldDate).getTime() - new Date(a.soldDate).getTime())
      .slice(0, 30)
      .map(p => ({
        address: p.address,
        askingPrice: p.askingPrice,
        soldPrice: p.soldPrice,
        soldDate: p.soldDate,
        overUnderPercent: p.overUnderPercent,
        propertyType: p.propertyType,
        bedrooms: p.beds,
        floorArea: p.areaSqm,
        berRating: null, // Not available in sold properties data
      }));
    
    // Get monthly trend (last 24 months)
    const monthlyTrend = calculateMonthlyTrend(areaProperties);
    
    // Get property types breakdown
    const propertyTypes = calculatePropertyTypes(areaProperties);
    
    // Get price distribution
    const priceDistribution = calculatePriceDistribution(areaProperties);
    
    // Get bedroom breakdown
    const bedroomBreakdown = calculateBedroomBreakdown(areaProperties);
    
    // Get rental yield data
    const yieldData = calculateYieldData(areaProperties);
    
    // Get nearby areas comparison
    const nearbyComparison = await getNearbyAreasComparison(allProperties, areaName, stats);
    
    return NextResponse.json({
      area: areaName,
      slug,
      stats,
      recentSales,
      monthlyTrend,
      propertyTypes,
      priceDistribution,
      bedroomBreakdown,
      yieldData,
      nearbyComparison,
    });
  } catch (error) {
    console.error('Error loading area data:', error);
    return NextResponse.json(
      { error: 'Failed to load area data' },
      { status: 500 }
    );
  }
}

/**
 * Calculate area statistics
 */
function calculateAreaStats(properties: Property[]) {
  const prices = properties.map(p => p.soldPrice).sort((a, b) => a - b);
  const medianPrice = prices[Math.floor(prices.length / 2)];
  const avgPrice = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);
  
  const withSqm = properties.filter(p => p.pricePerSqm && p.pricePerSqm > 0);
  const avgPricePerSqm = withSqm.length > 0
    ? Math.round(withSqm.reduce((sum, p) => sum + (p.pricePerSqm || 0), 0) / withSqm.length)
    : 0;
  
  const overAsking = properties.filter(p => p.overUnderPercent > 0);
  const pctOverAsking = Math.round((overAsking.length / properties.length) * 100);
  
  const avgOverUnder = Math.round(
    (properties.reduce((sum, p) => sum + p.overUnderPercent, 0) / properties.length) * 10
  ) / 10;
  
  // Calculate 6-month change
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const recent = properties.filter(p => new Date(p.soldDate) >= sixMonthsAgo);
  const older = properties.filter(p => {
    const d = new Date(p.soldDate);
    return d < sixMonthsAgo && d >= new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() - 6, 1);
  });
  
  let change6m = 0;
  if (recent.length > 3 && older.length > 3) {
    const recentMedian = recent.map(p => p.soldPrice).sort((a, b) => a - b)[Math.floor(recent.length / 2)];
    const olderMedian = older.map(p => p.soldPrice).sort((a, b) => a - b)[Math.floor(older.length / 2)];
    change6m = Math.round(((recentMedian - olderMedian) / olderMedian) * 1000) / 10;
  }
  
  return {
    totalSales: properties.length,
    medianPrice,
    avgPrice,
    avgPricePerSqm,
    pctOverAsking,
    avgOverUnder,
    change6m,
    minPrice: prices[0],
    maxPrice: prices[prices.length - 1],
  };
}

/**
 * Calculate monthly trend for chart
 */
function calculateMonthlyTrend(properties: Property[]) {
  const monthMap = new Map<string, { prices: number[]; count: number }>();
  
  properties.forEach(p => {
    const month = p.soldDate.substring(0, 7); // "2025-01"
    if (!monthMap.has(month)) {
      monthMap.set(month, { prices: [], count: 0 });
    }
    const data = monthMap.get(month)!;
    data.prices.push(p.soldPrice);
    data.count++;
  });
  
  const trend = Array.from(monthMap.entries())
    .map(([month, data]) => {
      const sortedPrices = data.prices.sort((a, b) => a - b);
      const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
      return {
        month,
        median,
        count: data.count,
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-24); // Last 24 months
  
  return trend;
}

/**
 * Calculate property types breakdown
 */
function calculatePropertyTypes(properties: Property[]) {
  const typeMap = new Map<string, number>();
  
  properties.forEach(p => {
    const type = p.propertyType || 'Unknown';
    typeMap.set(type, (typeMap.get(type) || 0) + 1);
  });
  
  return Array.from(typeMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Calculate price distribution for histogram
 */
function calculatePriceDistribution(properties: Property[]) {
  const buckets = [
    { range: '< €200k', min: 0, max: 200000, count: 0 },
    { range: '€200k-€300k', min: 200000, max: 300000, count: 0 },
    { range: '€300k-€400k', min: 300000, max: 400000, count: 0 },
    { range: '€400k-€500k', min: 400000, max: 500000, count: 0 },
    { range: '€500k-€600k', min: 500000, max: 600000, count: 0 },
    { range: '€600k-€800k', min: 600000, max: 800000, count: 0 },
    { range: '€800k-€1M', min: 800000, max: 1000000, count: 0 },
    { range: '> €1M', min: 1000000, max: Infinity, count: 0 },
  ];
  
  properties.forEach(p => {
    const bucket = buckets.find(b => p.soldPrice >= b.min && p.soldPrice < b.max);
    if (bucket) bucket.count++;
  });
  
  return buckets.filter(b => b.count > 0);
}

/**
 * Calculate average price by bedroom count
 */
function calculateBedroomBreakdown(properties: Property[]) {
  const bedroomMap = new Map<number, number[]>();
  
  properties.forEach(p => {
    if (p.beds && p.beds > 0 && p.beds <= 6) {
      if (!bedroomMap.has(p.beds)) {
        bedroomMap.set(p.beds, []);
      }
      bedroomMap.get(p.beds)!.push(p.soldPrice);
    }
  });
  
  return Array.from(bedroomMap.entries())
    .map(([bedrooms, prices]) => {
      const sortedPrices = prices.sort((a, b) => a - b);
      const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
      return {
        bedrooms,
        count: prices.length,
        medianPrice: median,
      };
    })
    .sort((a, b) => a.bedrooms - b.bedrooms);
}

/**
 * Calculate rental yield data from yieldEstimate
 */
function calculateYieldData(properties: Property[]) {
  const withYield = properties.filter(p => p.yieldEstimate && p.yieldEstimate.grossYield > 0);
  
  if (withYield.length === 0) {
    return null;
  }
  
  const yields = withYield.map(p => p.yieldEstimate!.grossYield);
  const rents = withYield.map(p => p.yieldEstimate!.monthlyRent);
  
  const avgYield = Math.round((yields.reduce((sum, y) => sum + y, 0) / yields.length) * 10) / 10;
  const medianRent = rents.sort((a, b) => a - b)[Math.floor(rents.length / 2)];
  const minRent = Math.min(...rents);
  const maxRent = Math.max(...rents);
  
  // Count by confidence level
  const highConfidence = withYield.filter(p => p.yieldEstimate!.confidence === 'high').length;
  const mediumConfidence = withYield.filter(p => p.yieldEstimate!.confidence === 'medium').length;
  
  return {
    avgYield,
    medianRent,
    rentRange: { min: minRent, max: maxRent },
    propertiesWithData: withYield.length,
    totalProperties: properties.length,
    coverage: Math.round((withYield.length / properties.length) * 100),
    confidence: highConfidence > mediumConfidence ? 'high' : 'medium',
  };
}

/**
 * Get nearby areas for comparison
 */
// Cache for individual area stats (lazy loaded as needed)
const areaStatsCache = new Map<string, { medianPrice: number; avgPricePerSqm: number; count: number }>();

async function getNearbyAreasComparison(
  allProperties: Property[],
  currentArea: string,
  currentStats: any
) {
  const { getAreaStats } = await import('@/lib/data');
  const { DUBLIN_AREAS, addressMatchesArea } = await import('@/lib/areas');
  
  // Step 1: Get quick approximate stats using extractArea (fast but may be slightly inconsistent)
  const allAreaStats = getAreaStats(allProperties);
  
  // Step 2: Filter to areas in our DUBLIN_AREAS list with similar prices
  const priceRange = {
    min: currentStats.medianPrice * 0.7,
    max: currentStats.medianPrice * 1.3,
  };
  
  // Helper to normalize area name (remove ", Dublin X" suffix)
  const normalizeAreaName = (name: string): string => {
    return name.replace(/,?\s*Dublin\s*\d+\w?$/i, '').trim();
  };
  
  // Find candidate areas from quick stats
  const candidates = allAreaStats
    .filter(a => {
      const normalized = normalizeAreaName(a.name);
      return a.name.toLowerCase() !== currentArea.toLowerCase() &&
        a.medianPrice >= priceRange.min &&
        a.medianPrice <= priceRange.max &&
        a.count >= 10 &&
        DUBLIN_AREAS.some(da => da.name.toLowerCase() === normalized.toLowerCase());
    })
    .sort((a, b) => {
      const aDiff = Math.abs(a.medianPrice - currentStats.medianPrice);
      const bDiff = Math.abs(b.medianPrice - currentStats.medianPrice);
      return aDiff - bDiff;
    })
    .slice(0, 10); // Get top 10 candidates (we'll recalc accurately and take top 5)
  
  // Step 3: Recalculate ONLY the top candidates with accurate addressMatchesArea
  const accurateStats = candidates.map(candidate => {
    const normalized = normalizeAreaName(candidate.name);
    const area = DUBLIN_AREAS.find(a => a.name.toLowerCase() === normalized.toLowerCase());
    
    if (!area) return null;
    
    // Check cache first
    const cacheKey = area.name.toLowerCase();
    if (!areaStatsCache.has(cacheKey)) {
      // Calculate accurate stats
      const areaProps = allProperties.filter(p => addressMatchesArea(p.address, area.name));
      
      if (areaProps.length < 10) return null;
      
      const prices = areaProps.map(p => p.soldPrice).sort((a, b) => a - b);
      const medianPrice = prices[Math.floor(prices.length / 2)];
      
      const withSqm = areaProps.filter(p => p.pricePerSqm && p.pricePerSqm > 0);
      const avgPricePerSqm = withSqm.length > 0
        ? Math.round(withSqm.reduce((sum, p) => sum + (p.pricePerSqm || 0), 0) / withSqm.length)
        : 0;
      
      areaStatsCache.set(cacheKey, { medianPrice, avgPricePerSqm, count: areaProps.length });
    }
    
    const stats = areaStatsCache.get(cacheKey)!;
    return {
      name: area.name,
      ...stats,
    };
  }).filter((a): a is NonNullable<typeof a> => a !== null);
  
  // Step 4: Re-sort with accurate stats and take top 5
  return accurateStats
    .sort((a, b) => {
      const aDiff = Math.abs(a.medianPrice - currentStats.medianPrice);
      const bDiff = Math.abs(b.medianPrice - currentStats.medianPrice);
      return aDiff - bDiff;
    })
    .slice(0, 5)
    .map(area => ({
      name: area.name,
      medianPrice: area.medianPrice,
      priceDiff: Math.round(((area.medianPrice - currentStats.medianPrice) / currentStats.medianPrice) * 100),
      avgPricePerSqm: area.avgPricePerSqm,
      sqmDiff: area.avgPricePerSqm > 0 && currentStats.avgPricePerSqm > 0
        ? Math.round(((area.avgPricePerSqm - currentStats.avgPricePerSqm) / currentStats.avgPricePerSqm) * 100)
        : null,
    }));
}

