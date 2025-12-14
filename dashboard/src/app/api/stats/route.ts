import { NextResponse } from 'next/server';
import { loadProperties, getMarketStats, getAreaStats } from '@/lib/data';

export async function GET() {
  const properties = loadProperties();
  const stats = getMarketStats(properties);
  const areaStats = getAreaStats(properties);
  
  // Get property type distribution
  const typeMap = new Map<string, number>();
  properties.forEach(p => {
    const type = p.propertyType || 'Unknown';
    typeMap.set(type, (typeMap.get(type) || 0) + 1);
  });
  const propertyTypes = Array.from(typeMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  
  // Get monthly trend data
  const monthlyMap = new Map<string, { prices: number[], count: number }>();
  properties.forEach(p => {
    const month = p.soldDate.substring(0, 7); // YYYY-MM
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, { prices: [], count: 0 });
    }
    const entry = monthlyMap.get(month)!;
    entry.prices.push(p.soldPrice);
    entry.count++;
  });
  
  const monthlyTrend = Array.from(monthlyMap.entries())
    .map(([month, data]) => {
      const sorted = data.prices.sort((a, b) => a - b);
      return {
        month,
        median: sorted[Math.floor(sorted.length / 2)],
        count: data.count,
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-24); // Last 24 months
  
  return NextResponse.json({
    stats,
    areaStats: areaStats.slice(0, 30), // Top 30 areas
    propertyTypes,
    monthlyTrend,
  });
}

