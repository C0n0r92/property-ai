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

/**
 * Calculate days on market from first seen date
 */
export function calculateDaysOnMarket(firstSeenDate?: string | null, currentDate?: Date): number {
  if (!firstSeenDate) return 0;

  const startDate = new Date(firstSeenDate);
  const endDate = currentDate || new Date();

  // Ensure dates are valid
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return 0;
  }

  const timeDiff = endDate.getTime() - startDate.getTime();
  return Math.max(0, Math.floor(timeDiff / (1000 * 3600 * 24)));
}

/**
 * Get Days on Market badge information
 */
export function getDaysOnMarketBadge(daysOnMarket: number): { text: string; color: string; emoji: string } | null {
  if (daysOnMarket >= 90) {
    return { text: '90+ days on market', color: 'bg-red-500', emoji: '🐌' };
  } else if (daysOnMarket >= 60) {
    return { text: `${daysOnMarket} days on market`, color: 'bg-orange-500', emoji: '⏳' };
  } else if (daysOnMarket >= 30) {
    return { text: `${daysOnMarket} days on market`, color: 'bg-yellow-500', emoji: '📅' };
  } else if (daysOnMarket <= 7) {
    return { text: 'Hot property', color: 'bg-green-500', emoji: '🔥' };
  }
  return null;
}

export interface PriceHistoryEntry {
  date: string;
  price: number;
}

/**
 * Analyze price history to detect price drops
 */
export function analyzePriceHistory(priceHistory: PriceHistoryEntry[] | null | undefined): {
  hasPriceDrop: boolean;
  latestPrice: number;
  originalPrice: number;
  priceDropAmount: number;
  priceDropPercent: number;
  lastPriceChange: string;
} | null {
  if (!priceHistory || priceHistory.length < 2) {
    return null;
  }

  // Sort by date (most recent first)
  const sortedHistory = [...priceHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const latestPrice = sortedHistory[0].price;
  const originalPrice = sortedHistory[sortedHistory.length - 1].price;

  if (latestPrice >= originalPrice) {
    return null; // No price drop
  }

  const priceDropAmount = originalPrice - latestPrice;
  const priceDropPercent = (priceDropAmount / originalPrice) * 100;

  return {
    hasPriceDrop: true,
    latestPrice,
    originalPrice,
    priceDropAmount,
    priceDropPercent,
    lastPriceChange: sortedHistory[0].date
  };
}

/**
 * Get price drop badge information
 */
export function getPriceDropBadge(priceAnalysis: ReturnType<typeof analyzePriceHistory>): { text: string; color: string; emoji: string } | null {
  if (!priceAnalysis) return null;

  const { priceDropPercent } = priceAnalysis;

  if (priceDropPercent >= 10) {
    return { text: `-${priceDropPercent.toFixed(0)}% price drop`, color: 'bg-red-600', emoji: '📉' };
  } else if (priceDropPercent >= 5) {
    return { text: `-${priceDropPercent.toFixed(0)}% reduced`, color: 'bg-orange-600', emoji: '⬇️' };
  } else if (priceDropPercent > 0) {
    return { text: `-${priceDropPercent.toFixed(0)}% off`, color: 'bg-yellow-600', emoji: '💰' };
  }

  return null;
}

/**
 * Find comparable properties for valuation analysis
 */
export function findComparableProperties(
  targetProperty: any,
  allProperties: any[],
  maxComparables: number = 5,
  maxDistanceKm: number = 2
): any[] {
  if (!targetProperty.latitude || !targetProperty.longitude) {
    return [];
  }

  const comparables = allProperties.filter(property => {
    // Don't compare with itself
    if (property.id === targetProperty.id) return false;

    // Must have valid coordinates and price
    if (!property.latitude || !property.longitude || !property.pricePerSqm) return false;

    // Calculate distance
    const distance = calculateDistance(
      targetProperty.latitude,
      targetProperty.longitude,
      property.latitude,
      property.longitude
    );

    // Must be within distance limit
    if (distance > maxDistanceKm) return false;

    // Similar property type (if available)
    if (targetProperty.propertyType && property.propertyType) {
      if (targetProperty.propertyType.toLowerCase() !== property.propertyType.toLowerCase()) {
        return false;
      }
    }

    // Similar bedroom count (±1)
    if (targetProperty.beds && property.beds) {
      if (Math.abs(targetProperty.beds - property.beds) > 1) return false;
    }

    // Similar size (±20%)
    if (targetProperty.areaSqm && property.areaSqm) {
      const sizeRatio = property.areaSqm / targetProperty.areaSqm;
      if (sizeRatio < 0.8 || sizeRatio > 1.2) return false;
    }

    return true;
  });

  // Sort by distance and return top comparables
  return comparables
    .sort((a, b) => {
      const distA = calculateDistance(targetProperty.latitude, targetProperty.longitude, a.latitude, a.longitude);
      const distB = calculateDistance(targetProperty.latitude, targetProperty.longitude, b.latitude, b.longitude);
      return distA - distB;
    })
    .slice(0, maxComparables);
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Analyze if a property is a good value compared to comparables
 */
export function analyzePropertyValue(
  targetProperty: any,
  allProperties: any[]
): {
  isGoodValue: boolean;
  valueScore: number;
  comparablesCount: number;
  avgComparablePrice: number;
  priceDifferencePercent: number;
} | null {
  if (!targetProperty.pricePerSqm) return null;

  const comparables = findComparableProperties(targetProperty, allProperties);

  if (comparables.length < 2) return null; // Need at least 2 comparables for meaningful analysis

  const comparablePrices = comparables.map(c => c.pricePerSqm).filter(p => p > 0);
  if (comparablePrices.length === 0) return null;

  const avgComparablePrice = comparablePrices.reduce((sum, price) => sum + price, 0) / comparablePrices.length;
  const priceDifferencePercent = ((avgComparablePrice - targetProperty.pricePerSqm) / avgComparablePrice) * 100;

  // Consider it a good value if it's at least 10% below average comparable price
  const isGoodValue = priceDifferencePercent >= 10;

  return {
    isGoodValue,
    valueScore: Math.max(0, priceDifferencePercent), // Positive score means it's cheaper than average
    comparablesCount: comparables.length,
    avgComparablePrice,
    priceDifferencePercent
  };
}

/**
 * Get Best Value badge information
 */
export function getBestValueBadge(valueAnalysis: ReturnType<typeof analyzePropertyValue>): { text: string; color: string; emoji: string } | null {
  if (!valueAnalysis?.isGoodValue) return null;

  const { priceDifferencePercent } = valueAnalysis;

  if (priceDifferencePercent >= 20) {
    return { text: `Best value! ${priceDifferencePercent.toFixed(0)}% below avg`, color: 'bg-green-600', emoji: '💎' };
  } else if (priceDifferencePercent >= 15) {
    return { text: `Great value! ${priceDifferencePercent.toFixed(0)}% below avg`, color: 'bg-emerald-600', emoji: '🏆' };
  } else if (priceDifferencePercent >= 10) {
    return { text: `Good value! ${priceDifferencePercent.toFixed(0)}% below avg`, color: 'bg-teal-600', emoji: '⭐' };
  }

  return null;
}















