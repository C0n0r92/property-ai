import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { slugToArea } from '@/lib/areas';

/**
 * API endpoint for 12-month price trend data
 * GET /api/areas/dublin-4/trends
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
    const supabase = await createClient();

    // Calculate date 12 months ago
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);
    const twelveMonthsAgoStr = twelveMonthsAgo.toISOString().split('T')[0];

    // Query sold properties from the last 12 months
    // Filter by area using address matching (PostgreSQL pattern matching)
    const { data: properties, error } = await supabase
      .from('sold_properties')
      .select('sold_date, sold_price, address')
      .gte('sold_date', twelveMonthsAgoStr)
      .gte('sold_price', 50000) // Filter out erroneous data
      .order('sold_date', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to load trend data' },
        { status: 500 }
      );
    }

    if (!properties || properties.length === 0) {
      return NextResponse.json({
        area: areaName,
        slug,
        trends: [],
        totalSales: 0,
        message: 'No recent sales data available'
      });
    }

    // Filter properties that match the area
    const areaProperties = properties.filter(p =>
      addressMatchesArea(p.address, areaName)
    );

    if (areaProperties.length === 0) {
      return NextResponse.json({
        area: areaName,
        slug,
        trends: [],
        totalSales: 0,
        message: 'No sales data for this area in the last 12 months'
      });
    }

    // Group by month and calculate median price
    const monthMap = new Map<string, number[]>();

    areaProperties.forEach(p => {
      const month = p.sold_date.substring(0, 7); // "2025-01"
      if (!monthMap.has(month)) {
        monthMap.set(month, []);
      }
      monthMap.get(month)!.push(p.sold_price);
    });

    // Calculate median for each month
    const trends = Array.from(monthMap.entries())
      .map(([month, prices]) => {
        const sorted = prices.sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        return {
          month,
          medianPrice: median,
          count: prices.length
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json({
      area: areaName,
      slug,
      trends,
      totalSales: areaProperties.length,
      generated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error loading trend data:', error);
    return NextResponse.json(
      { error: 'Failed to load trend data' },
      { status: 500 }
    );
  }
}

/**
 * Check if an address matches an area
 */
function addressMatchesArea(address: string, areaName: string): boolean {
  const normalizedAddress = address.toLowerCase();
  const normalizedArea = areaName.toLowerCase();

  // Check for district number (Dublin 4, D4, etc.)
  if (/dublin\s*\d+/.test(normalizedArea)) {
    const districtMatch = normalizedArea.match(/dublin\s*(\d+w?)/);
    if (districtMatch) {
      const district = districtMatch[1];
      const pattern = new RegExp(`(dublin\\s*${district}|d${district}(?!\\d)|dublin${district})\\b`, 'i');
      return pattern.test(normalizedAddress);
    }
  }

  // Check for named area - word boundary to avoid partial matches
  const escapedArea = normalizedArea.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wordBoundaryPattern = new RegExp(`\\b${escapedArea}\\b`, 'i');
  return wordBoundaryPattern.test(normalizedAddress);
}
