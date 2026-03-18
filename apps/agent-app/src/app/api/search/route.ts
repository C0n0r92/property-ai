import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { canPerformSearch, incrementSearchCount } from '@/lib/billing';
import { promises as fs } from 'fs';
import path from 'path';
import { calculateLocationInsights } from '@/lib/location-insights';
import { calculateExtensionValues } from '@/lib/extension-value';

// Helper to decode JWT and get user ID
function getUserIdFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.sub || null;
  } catch (e) {
    return null;
  }
}

// Cache data in memory with 1 hour TTL
let cachedData: any = null;
let cacheTime = 0;
const CACHE_DURATION = 3600000; // 1 hour

async function loadData() {
  const now = Date.now();

  if (cachedData && now - cacheTime < CACHE_DURATION) {
    return cachedData;
  }

  // Try local file first (in public folder)
  try {
    const filePath = path.join(process.cwd(), 'public', 'data.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    cachedData = JSON.parse(fileContent);
    cacheTime = now;
    return cachedData;
  } catch (localError) {
    console.warn('Local data.json not found, trying external URL');
  }

  // Fallback to external URL
  try {
    const dataUrl = process.env.NEXT_PUBLIC_DATA_URL || 'https://irishpropertydata.com/data.json';
    const response = await fetch(dataUrl, { next: { revalidate: 3600 } });

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status}`);
    }

    cachedData = await response.json();
    cacheTime = now;
    return cachedData;
  } catch (error) {
    console.error('Error loading data:', error);
    throw error;
  }
}

// Calculate distance in km using haversine formula
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function normalizeAddress(address: string): string {
  return address.toLowerCase().trim();
}

function findComparables(property: any, allProperties: any[], radiusKm: number = 2, maxAgeMonths: number = 12) {
  if (!property.latitude || !property.longitude) {
    return [];
  }

  // Calculate cutoff date for recency filter
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - maxAgeMonths);
  const cutoffTime = cutoffDate.getTime();

  const propertyPrice = property.soldPrice || property.askingPrice;

  // First pass: find exact bed matches
  const exactBedMatches = allProperties
    .filter((p) => {
      if (!p.latitude || !p.longitude || !p.soldPrice) return false;
      if (p.address === property.address) return false;

      // Time filter: only include sales within maxAgeMonths
      const saleDate = p.soldDate || p.scrapedAt;
      if (saleDate) {
        const saleTime = new Date(saleDate).getTime();
        if (saleTime < cutoffTime) return false;
      }

      const distance = haversineDistance(
        property.latitude,
        property.longitude,
        p.latitude,
        p.longitude
      );

      // Match criteria: within radius, same type, EXACT beds
      const sameType = p.propertyType === property.propertyType;
      const sameBeds = p.beds === property.beds;
      const withinRadius = distance <= radiusKm;

      // Price sanity check: within 50% of subject property (if we have a price)
      let priceReasonable = true;
      if (propertyPrice && propertyPrice > 0) {
        const priceDiff = Math.abs(p.soldPrice - propertyPrice) / propertyPrice;
        priceReasonable = priceDiff <= 0.5;
      }

      return withinRadius && sameType && sameBeds && priceReasonable;
    })
    .map((p) => ({
      ...p,
      distance: haversineDistance(
        property.latitude,
        property.longitude,
        p.latitude,
        p.longitude
      ),
    }));

  // If we have enough exact matches, use those
  let comparables = exactBedMatches;

  // If not enough exact matches, expand to +/-1 bed
  if (exactBedMatches.length < 5) {
    const expandedMatches = allProperties
      .filter((p) => {
        if (!p.latitude || !p.longitude || !p.soldPrice) return false;
        if (p.address === property.address) return false;

        const saleDate = p.soldDate || p.scrapedAt;
        if (saleDate) {
          const saleTime = new Date(saleDate).getTime();
          if (saleTime < cutoffTime) return false;
        }

        const distance = haversineDistance(
          property.latitude,
          property.longitude,
          p.latitude,
          p.longitude
        );

        const sameType = p.propertyType === property.propertyType;
        const bedsDiff = Math.abs((p.beds ?? 0) - (property.beds ?? 0));
        const withinRadius = distance <= radiusKm;

        // Price sanity check
        let priceReasonable = true;
        if (propertyPrice && propertyPrice > 0) {
          const priceDiff = Math.abs(p.soldPrice - propertyPrice) / propertyPrice;
          priceReasonable = priceDiff <= 0.5;
        }

        return withinRadius && sameType && bedsDiff <= 1 && priceReasonable;
      })
      .map((p) => ({
        ...p,
        distance: haversineDistance(
          property.latitude,
          property.longitude,
          p.latitude,
          p.longitude
        ),
      }));

    comparables = expandedMatches;
  }

  // Sort by: 1) exact bed match first, 2) closer distance, 3) recency
  return comparables
    .sort((a, b) => {
      // Prefer exact bed matches
      const aExactBeds = a.beds === property.beds ? 0 : 1;
      const bExactBeds = b.beds === property.beds ? 0 : 1;
      if (aExactBeds !== bExactBeds) return aExactBeds - bExactBeds;

      // Then by distance (closer is better)
      const distDiff = (a.distance || 0) - (b.distance || 0);
      if (Math.abs(distDiff) > 0.1) return distDiff;

      // Then by recency
      const aDate = new Date(a.scrapedAt || 0).getTime();
      const bDate = new Date(b.scrapedAt || 0).getTime();
      return bDate - aDate;
    })
    .slice(0, 10);
}

function calculateStats(properties: any[]) {
  if (properties.length === 0) {
    return null;
  }

  const prices = properties
    .map((p) => p.soldPrice || p.askingPrice)
    .filter((p) => p > 0 && p < 10000000) // Remove obviously bad data (future dates)
    .sort((a, b) => a - b);

  const pricePerSqm = properties
    .filter((p) => p.areaSqm && p.areaSqm > 0 && p.soldPrice && p.soldPrice > 0)
    .map((p) => p.soldPrice / p.areaSqm)
    .sort((a, b) => a - b);

  const overAskingPercents = properties
    .filter((p) => p.askingPrice && p.soldPrice && p.askingPrice > 0)
    .map((p) => ((p.soldPrice - p.askingPrice) / p.askingPrice) * 100);

  const median = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  };

  const average = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  return {
    medianPrice: Math.round(median(prices)),
    averagePrice: Math.round(average(prices)),
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    medianPricePerSqm: Math.round(median(pricePerSqm) * 100) / 100,
    averagePricePerSqm: Math.round(average(pricePerSqm) * 100) / 100,
    medianOverAskingPercent: Math.round(median(overAskingPercents) * 100) / 100,
    averageOverAskingPercent: Math.round(average(overAskingPercents) * 100) / 100,
    count: properties.length,
  };
}

function assessDeal(property: any, stats: any): { verdict: string; assessment: string } {
  if (!stats || stats.count === 0) {
    return {
      verdict: 'insufficient_data',
      assessment: 'Not enough comparable data in this area',
    };
  }

  if (!property.soldPrice) {
    return {
      verdict: 'unknown',
      assessment: 'No price data available',
    };
  }

  const percentDiff = ((property.soldPrice - stats.medianPrice) / stats.medianPrice) * 100;

  if (percentDiff < -15) {
    return {
      verdict: 'great_deal',
      assessment: `This property sold ${Math.abs(percentDiff).toFixed(1)}% BELOW market rate - exceptional value`,
    };
  } else if (percentDiff < -5) {
    return {
      verdict: 'good_value',
      assessment: `This property sold ${Math.abs(percentDiff).toFixed(1)}% below market rate - good value`,
    };
  } else if (percentDiff <= 5) {
    return {
      verdict: 'fair_price',
      assessment: `This property sold at fair market rate`,
    };
  } else if (percentDiff <= 15) {
    return {
      verdict: 'above_market',
      assessment: `This property sold ${percentDiff.toFixed(1)}% above market rate`,
    };
  } else {
    return {
      verdict: 'premium',
      assessment: `This property sold ${percentDiff.toFixed(1)}% above market rate - premium price`,
    };
  }
}

// Calculate yield analysis from property data and area stats
function calculateYieldAnalysis(
  property: any,
  areaStats: any,
  allProperties: any[]
) {
  // If property already has yield estimate, use it
  if (property.yieldEstimate) {
    const areaMedianYield = calculateAreaMedianYield(property, allProperties);
    return {
      estimatedMonthlyRent: property.yieldEstimate.monthlyRent,
      grossYield: property.yieldEstimate.grossYield,
      confidence: property.yieldEstimate.confidence || 'medium',
      areaMedianYield,
      rentalDataPoints: property.yieldEstimate.dataPoints || 0,
    };
  }

  // Otherwise calculate from area stats
  const postcode = property.dublinPostcode;
  const beds = property.beds || 2;
  const price = property.soldPrice || property.askingPrice;

  if (!postcode || !areaStats?.[postcode]?.bedrooms?.[beds] || !price) {
    return null;
  }

  const areaData = areaStats[postcode].bedrooms[beds];
  const estimatedMonthlyRent = areaData.medianRent;
  const grossYield = ((estimatedMonthlyRent * 12) / price) * 100;
  const areaMedianYield = calculateAreaMedianYield(property, allProperties);

  return {
    estimatedMonthlyRent,
    grossYield: Math.round(grossYield * 100) / 100,
    confidence: areaData.count >= 20 ? 'high' : areaData.count >= 10 ? 'medium' : 'low' as 'high' | 'medium' | 'low',
    areaMedianYield,
    rentalDataPoints: areaData.count,
  };
}

function calculateAreaMedianYield(property: any, allProperties: any[]): number | null {
  const postcode = property.dublinPostcode;
  if (!postcode) return null;

  // Find properties in the same area with yield estimates
  const areaYields = allProperties
    .filter((p) =>
      p.dublinPostcode === postcode &&
      p.yieldEstimate?.grossYield &&
      p.yieldEstimate.grossYield > 0 &&
      p.yieldEstimate.grossYield < 20 // Filter out unrealistic yields
    )
    .map((p) => p.yieldEstimate.grossYield);

  if (areaYields.length < 3) return null; // Need at least 3 data points

  // Calculate median
  const sorted = areaYields.sort((a: number, b: number) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;

  return Math.round(median * 100) / 100;
}

// Calculate market position from active listings
function calculateMarketPosition(
  property: any,
  listings: any[],
  radiusKm: number = 3
) {
  if (!property.latitude || !property.longitude) {
    return null;
  }

  const propertyPrice = property.soldPrice || property.askingPrice;

  // Find similar active listings
  const similarListings = listings.filter((l) => {
    if (!l.latitude || !l.longitude || !l.askingPrice) return false;

    const distance = haversineDistance(
      property.latitude,
      property.longitude,
      l.latitude,
      l.longitude
    );

    const sameType = !property.propertyType || l.propertyType === property.propertyType;
    const bedsDiff = Math.abs((l.beds ?? 0) - (property.beds ?? 0));
    const withinRadius = distance <= radiusKm;

    return withinRadius && sameType && bedsDiff <= 1;
  });

  if (similarListings.length === 0) {
    return null;
  }

  const prices = similarListings.map((l) => l.askingPrice).filter((p) => p > 0);
  const daysOnMarket = similarListings
    .map((l) => l.daysOnMarket)
    .filter((d) => d !== undefined && d !== null && d >= 0);

  const avgActiveAskingPrice = prices.length > 0
    ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    : 0;

  const avgDaysOnMarket = daysOnMarket.length > 0
    ? Math.round(daysOnMarket.reduce((a, b) => a + b, 0) / daysOnMarket.length)
    : null;

  const priceVsActiveListings = avgActiveAskingPrice > 0 && propertyPrice
    ? Math.round(((propertyPrice - avgActiveAskingPrice) / avgActiveAskingPrice) * 1000) / 10
    : null;

  // Calculate price reduction stats
  const listingsWithPriceDrops = similarListings.filter(
    (l) => l.priceChanges && l.priceChanges > 0 && l.priceHistory && l.priceHistory.length > 1
  );
  const priceDropPercent = similarListings.length > 0
    ? Math.round((listingsWithPriceDrops.length / similarListings.length) * 100)
    : null;

  // Calculate average price reduction for listings that dropped
  let avgPriceReduction: number | null = null;
  if (listingsWithPriceDrops.length > 0) {
    const reductions = listingsWithPriceDrops.map((l) => {
      const history = l.priceHistory || [];
      if (history.length < 2) return 0;
      const firstPrice = history[0]?.price || 0;
      const currentPrice = l.askingPrice || history[history.length - 1]?.price || 0;
      if (firstPrice > 0 && currentPrice > 0 && currentPrice < firstPrice) {
        return ((firstPrice - currentPrice) / firstPrice) * 100;
      }
      return 0;
    }).filter((r) => r > 0);

    if (reductions.length > 0) {
      avgPriceReduction = Math.round((reductions.reduce((a, b) => a + b, 0) / reductions.length) * 10) / 10;
    }
  }

  // Calculate stale listings (>90 days on market)
  const staleListings = similarListings.filter(
    (l) => l.daysOnMarket && l.daysOnMarket > 90
  );
  const staleListingPercent = similarListings.length > 0
    ? Math.round((staleListings.length / similarListings.length) * 100)
    : null;

  return {
    activeListingsCount: similarListings.length,
    avgActiveAskingPrice,
    avgDaysOnMarket,
    priceVsActiveListings,
    priceDropPercent,
    avgPriceReduction,
    staleListingPercent,
  };
}

// Get area trend data from propertyAreaStats
function getAreaTrend(property: any, propertyAreaStats: any[]): { change6m: number; areaName: string } | null {
  if (!propertyAreaStats || !Array.isArray(propertyAreaStats)) return null;

  // Try to match by Dublin postcode first
  const postcode = property.dublinPostcode;
  if (postcode) {
    // Convert D15 format to "Dublin 15" format
    const areaName = postcode.replace(/^D(\d+)$/, 'Dublin $1').replace(/^D(\d+)([A-Z])$/, 'Dublin $1$2');
    const areaData = propertyAreaStats.find((a: any) => a.name === areaName);
    if (areaData && areaData.change6m !== undefined) {
      return { change6m: areaData.change6m, areaName: areaData.name };
    }
  }

  return null;
}

// Calculate bidding war statistics for the area
function calculateBiddingWars(comparables: any[], allProperties: any[], property: any) {
  // Use comparables if available, otherwise look at broader area
  const salesData = comparables.length > 0 ? comparables : [];

  // Also get area-level stats if we have a postcode
  let areaProperties: any[] = [];
  if (property.dublinPostcode) {
    areaProperties = allProperties.filter(
      (p) => p.dublinPostcode === property.dublinPostcode &&
             p.askingPrice && p.askingPrice > 0 &&
             p.soldPrice && p.soldPrice > 0 &&
             p.overUnderPercent !== undefined
    );
  }

  // Combine and deduplicate
  const allSales = [...salesData];
  for (const p of areaProperties) {
    if (!allSales.find((s) => s.id === p.id)) {
      allSales.push(p);
    }
  }

  if (allSales.length === 0) {
    return null;
  }

  // Filter to those with valid over/under data
  const withOverUnder = allSales.filter(
    (p) => p.askingPrice && p.askingPrice > 0 && p.soldPrice && p.soldPrice > 0
  );

  if (withOverUnder.length === 0) {
    return null;
  }

  // Calculate statistics
  const overAskingCount = withOverUnder.filter(
    (p) => (p.overUnderPercent ?? ((p.soldPrice - p.askingPrice) / p.askingPrice) * 100) > 0
  ).length;

  const premiums = withOverUnder
    .map((p) => p.overUnderPercent ?? ((p.soldPrice - p.askingPrice) / p.askingPrice) * 100)
    .filter((pct) => typeof pct === 'number' && !isNaN(pct));

  if (premiums.length === 0) {
    return null;
  }

  const percentOverAsking = Math.round((overAskingCount / withOverUnder.length) * 1000) / 10;
  const avgPremium = Math.round((premiums.reduce((a, b) => a + b, 0) / premiums.length) * 100) / 100;
  const highestPremium = Math.round(Math.max(...premiums) * 100) / 100;

  return {
    percentOverAsking,
    avgPremium,
    highestPremium,
    totalSalesAnalyzed: withOverUnder.length,
  };
}

// Calculate seasonal price trends - which months are cheapest/most expensive
function calculateSeasonalTrends(allProperties: any[], postcode?: string) {
  // Filter properties with valid dates and prices
  const twoYearsAgo = Date.now() - (2 * 365 * 24 * 60 * 60 * 1000);

  let properties = allProperties.filter((p) => {
    const saleDate = p.soldDate || p.scrapedAt;
    if (!saleDate || !p.soldPrice || p.soldPrice <= 0) return false;
    const saleTime = new Date(saleDate).getTime();
    return saleTime > twoYearsAgo;
  });

  // Optionally filter by postcode for more relevant data
  if (postcode) {
    const postcodeProperties = properties.filter((p) => p.dublinPostcode === postcode);
    // Only use postcode filter if we have enough data
    if (postcodeProperties.length >= 50) {
      properties = postcodeProperties;
    }
  }

  if (properties.length < 100) {
    return null;
  }

  // Group by month
  const monthlyData: { [key: number]: { prices: number[]; overUnder: number[] } } = {};
  for (let i = 0; i < 12; i++) {
    monthlyData[i] = { prices: [], overUnder: [] };
  }

  for (const p of properties) {
    const saleDate = new Date(p.soldDate || p.scrapedAt);
    const month = saleDate.getMonth();
    monthlyData[month].prices.push(p.soldPrice);

    if (p.overUnderPercent !== undefined) {
      monthlyData[month].overUnder.push(p.overUnderPercent);
    } else if (p.askingPrice && p.askingPrice > 0) {
      const overUnder = ((p.soldPrice - p.askingPrice) / p.askingPrice) * 100;
      monthlyData[month].overUnder.push(overUnder);
    }
  }

  // Calculate medians for each month
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyStats = monthNames.map((name, idx) => {
    const data = monthlyData[idx];
    const sortedPrices = [...data.prices].sort((a, b) => a - b);
    const sortedOverUnder = [...data.overUnder].sort((a, b) => a - b);

    const medianPrice = sortedPrices.length > 0
      ? sortedPrices[Math.floor(sortedPrices.length / 2)]
      : 0;

    const medianOverUnder = sortedOverUnder.length > 0
      ? sortedOverUnder[Math.floor(sortedOverUnder.length / 2)]
      : 0;

    return {
      month: name,
      medianPrice: Math.round(medianPrice),
      medianOverUnder: Math.round(medianOverUnder * 10) / 10,
      salesCount: data.prices.length,
    };
  });

  // Find best/worst months
  const validMonths = monthlyStats.filter((m) => m.salesCount >= 10);
  if (validMonths.length < 6) return null;

  const sortedByPrice = [...validMonths].sort((a, b) => a.medianPrice - b.medianPrice);
  const sortedByOverUnder = [...validMonths].sort((a, b) => a.medianOverUnder - b.medianOverUnder);

  const cheapestMonths = sortedByPrice.slice(0, 2).map((m) => m.month);
  const expensiveMonths = sortedByPrice.slice(-2).reverse().map((m) => m.month);
  const bestDealMonths = sortedByOverUnder.slice(0, 2).map((m) => m.month);

  // Calculate overall averages
  const avgPrice = Math.round(validMonths.reduce((sum, m) => sum + m.medianPrice, 0) / validMonths.length);

  return {
    monthlyStats,
    cheapestMonths,
    expensiveMonths,
    bestDealMonths,
    avgPrice,
    totalSalesAnalyzed: properties.length,
  };
}

// Calculate quarterly price trends
function calculateQuarterlyTrends(allProperties: any[], postcode?: string) {
  // Get last 8 quarters of data
  const now = new Date();
  const quarters: { [key: string]: number[] } = {};

  // Initialize last 8 quarters
  for (let i = 7; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - (i * 3));
    const year = date.getFullYear();
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const key = `${year} Q${quarter}`;
    quarters[key] = [];
  }

  let properties = allProperties.filter((p) => {
    const saleDate = p.soldDate || p.scrapedAt;
    return saleDate && p.soldPrice && p.soldPrice > 0;
  });

  // Optionally filter by postcode
  if (postcode) {
    const postcodeProperties = properties.filter((p) => p.dublinPostcode === postcode);
    if (postcodeProperties.length >= 100) {
      properties = postcodeProperties;
    }
  }

  // Assign properties to quarters
  for (const p of properties) {
    const saleDate = new Date(p.soldDate || p.scrapedAt);
    const year = saleDate.getFullYear();
    const quarter = Math.floor(saleDate.getMonth() / 3) + 1;
    const key = `${year} Q${quarter}`;

    if (quarters[key]) {
      quarters[key].push(p.soldPrice);
    }
  }

  // Calculate median for each quarter
  const quarterlyStats = Object.entries(quarters).map(([quarter, prices]) => {
    const sorted = [...prices].sort((a, b) => a - b);
    const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
    return {
      quarter,
      medianPrice: Math.round(median),
      salesCount: prices.length,
    };
  });

  // Calculate quarter-over-quarter changes
  const withChanges = quarterlyStats.map((q, idx) => {
    if (idx === 0 || quarterlyStats[idx - 1].medianPrice === 0) {
      return { ...q, change: null };
    }
    const prev = quarterlyStats[idx - 1].medianPrice;
    const change = ((q.medianPrice - prev) / prev) * 100;
    return { ...q, change: Math.round(change * 10) / 10 };
  });

  // Calculate overall trend (first quarter vs last quarter with data)
  const validQuarters = withChanges.filter((q) => q.salesCount >= 5);
  if (validQuarters.length < 2) return null;

  const first = validQuarters[0];
  const last = validQuarters[validQuarters.length - 1];
  const overallChange = first.medianPrice > 0
    ? Math.round(((last.medianPrice - first.medianPrice) / first.medianPrice) * 1000) / 10
    : null;

  return {
    quarters: withChanges,
    overallChange,
    periodStart: first.quarter,
    periodEnd: last.quarter,
    totalSalesAnalyzed: properties.length,
  };
}

// Calculate time-to-sell trends
function calculateTimeToSellTrends(allProperties: any[], postcode?: string) {
  // This uses daysOnMarket data where available
  let properties = allProperties.filter((p) => {
    return p.daysOnMarket !== undefined && p.daysOnMarket !== null && p.daysOnMarket >= 0;
  });

  if (postcode) {
    const postcodeProperties = properties.filter((p) => p.dublinPostcode === postcode);
    if (postcodeProperties.length >= 30) {
      properties = postcodeProperties;
    }
  }

  if (properties.length < 30) return null;

  // Group by month
  const monthlyData: { [key: number]: number[] } = {};
  for (let i = 0; i < 12; i++) {
    monthlyData[i] = [];
  }

  for (const p of properties) {
    const saleDate = new Date(p.soldDate || p.scrapedAt);
    const month = saleDate.getMonth();
    monthlyData[month].push(p.daysOnMarket);
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyStats = monthNames.map((name, idx) => {
    const days = monthlyData[idx];
    const sorted = [...days].sort((a, b) => a - b);
    const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
    return {
      month: name,
      medianDays: Math.round(median),
      salesCount: days.length,
    };
  });

  const validMonths = monthlyStats.filter((m) => m.salesCount >= 5);
  if (validMonths.length < 4) return null;

  const sortedByDays = [...validMonths].sort((a, b) => a.medianDays - b.medianDays);
  const fastestMonths = sortedByDays.slice(0, 2).map((m) => m.month);
  const slowestMonths = sortedByDays.slice(-2).reverse().map((m) => m.month);

  const avgDays = Math.round(validMonths.reduce((sum, m) => sum + m.medianDays, 0) / validMonths.length);

  return {
    monthlyStats,
    fastestMonths,
    slowestMonths,
    avgDays,
    totalSalesAnalyzed: properties.length,
  };
}

// Calculate price per sqm trends
function calculatePricePerSqmTrends(allProperties: any[], property: any) {
  const postcode = property.dublinPostcode;
  const propertyType = property.propertyType;

  // Filter to same postcode and type with sqm data
  const relevantProperties = allProperties.filter((p) => {
    return p.dublinPostcode === postcode &&
           p.propertyType === propertyType &&
           p.areaSqm && p.areaSqm > 0 &&
           p.soldPrice && p.soldPrice > 0;
  });

  if (relevantProperties.length < 10) return null;

  // Calculate price per sqm for each
  const pricesPerSqm = relevantProperties.map((p) => ({
    pricePerSqm: p.soldPrice / p.areaSqm,
    sqm: p.areaSqm,
  }));

  // Group by size bracket
  const brackets = [
    { name: 'Small (<60sqm)', min: 0, max: 60 },
    { name: 'Medium (60-90sqm)', min: 60, max: 90 },
    { name: 'Large (90-120sqm)', min: 90, max: 120 },
    { name: 'Very Large (>120sqm)', min: 120, max: Infinity },
  ];

  const bracketStats = brackets.map((bracket) => {
    const inBracket = pricesPerSqm.filter((p) => p.sqm >= bracket.min && p.sqm < bracket.max);
    if (inBracket.length < 3) return { ...bracket, medianPricePerSqm: null, count: 0 };

    const sorted = inBracket.map((p) => p.pricePerSqm).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    return {
      ...bracket,
      medianPricePerSqm: Math.round(median),
      count: inBracket.length,
    };
  }).filter((b) => b.count > 0);

  if (bracketStats.length < 2) return null;

  // Calculate overall median
  const allPricesPerSqm = pricesPerSqm.map((p) => p.pricePerSqm).sort((a, b) => a - b);
  const overallMedian = Math.round(allPricesPerSqm[Math.floor(allPricesPerSqm.length / 2)]);

  return {
    bracketStats,
    overallMedianPricePerSqm: overallMedian,
    totalAnalyzed: relevantProperties.length,
    postcode,
    propertyType,
  };
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user - try both cookie session and Authorization header
    let userId: string | null = null;

    // First try to get user from server-side session (cookies)
    const supabase = await createClient();
    const { data: { user: sessionUser } } = await supabase.auth.getUser();

    if (sessionUser) {
      userId = sessionUser.id;
    } else {
      // If no session in cookies, try Authorization header
      const authHeader = request.headers.get('authorization');

      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        userId = getUserIdFromToken(token);
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check billing limits
    const canSearch = await canPerformSearch(userId);
    if (!canSearch.allowed) {
      return NextResponse.json({ error: canSearch.message, limitReached: true }, { status: 429 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const data = await loadData();
    const allProperties = [...(data.properties || [])];

    // Try exact address match first
    let matches = allProperties.filter(
      (p) => p.address && normalizeAddress(p.address) === normalizeAddress(query)
    );

    // If no exact match, try substring match
    if (matches.length === 0) {
      matches = allProperties.filter((p) =>
        p.address && normalizeAddress(p.address).includes(normalizeAddress(query))
      );
    }

    if (matches.length === 0) {
      return NextResponse.json(
        {
          found: false,
          error: 'No properties found matching that address',
          suggestions: 'Try searching with a street address or part of the address',
        },
        { status: 404 }
      );
    }

    // If multiple matches, return them for disambiguation
    if (matches.length > 1) {
      return NextResponse.json({
        found: false,
        multiple: true,
        matches: matches.slice(0, 10).map((p) => ({
          address: p.address,
          beds: p.beds,
          baths: p.baths,
          type: p.propertyType,
          price: p.soldPrice || p.askingPrice,
        })),
        message: `Found ${matches.length} properties matching "${query}". Please select one.`,
      });
    }

    const property = matches[0];

    // Find comparables
    const comparables = findComparables(property, allProperties, 2);

    // Calculate stats
    const stats = calculateStats(comparables);

    // Assess deal
    const deal = assessDeal(property, stats);

    // Calculate new insights
    const yieldAnalysis = calculateYieldAnalysis(
      property,
      data.stats?.areaStats,
      allProperties
    );

    const marketPosition = calculateMarketPosition(
      property,
      data.listings || [],
      3
    );

    const biddingWars = calculateBiddingWars(
      comparables,
      allProperties,
      property
    );

    // Get area trend data
    const areaTrend = getAreaTrend(property, data.stats?.propertyAreaStats);

    // Calculate location insights (transport premium, nearest station)
    let locationInsights = null;
    if (property.latitude && property.longitude) {
      locationInsights = calculateLocationInsights(
        property.latitude,
        property.longitude,
        property.dublinPostcode,
        property.propertyType,
        property.beds,
        allProperties
      );
    }

    // Calculate extension value (for houses only)
    const extensionValue = calculateExtensionValues(
      property.propertyType,
      property.dublinPostcode,
      allProperties
    );

    // Calculate time-based trends (always have data from full dataset)
    const seasonalTrends = calculateSeasonalTrends(allProperties, property.dublinPostcode);
    const quarterlyTrends = calculateQuarterlyTrends(allProperties, property.dublinPostcode);
    const timeToSellTrends = calculateTimeToSellTrends(allProperties, property.dublinPostcode);
    const pricePerSqmTrends = calculatePricePerSqmTrends(allProperties, property);

    // Increment search count
    await incrementSearchCount(userId);

    return NextResponse.json({
      found: true,
      property: {
        ...property,
        deal,
      },
      comparables,
      stats,
      yieldAnalysis,
      marketPosition,
      biddingWars,
      areaTrend,
      locationInsights,
      extensionValue,
      seasonalTrends,
      quarterlyTrends,
      timeToSellTrends,
      pricePerSqmTrends,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
