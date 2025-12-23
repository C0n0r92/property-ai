#!/usr/bin/env tsx
/**
 * Analyze area price improvements over the last 6 months
 * 
 * This script analyzes property data to find which areas have shown
 * the biggest improvement in sell price over the last 6 months.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface Property {
  address: string;
  soldDate: string;
  soldPrice: number;
  askingPrice: number;
  overUnderPercent: number;
  beds: number | null;
  baths: number | null;
  areaSqm: number | null;
  propertyType: string;
  dublinPostcode: string | null;
  nominatimAddress: string | null;
}

interface AreaStats {
  name: string;
  recentMedian: number;
  olderMedian: number;
  change6m: number;
  recentCount: number;
  olderCount: number;
  totalCount: number;
  avgPricePerSqm: number;
  medianPrice: number;
}

function extractArea(address: string): string {
  // Use the same logic as extractPrimaryArea from areas.ts
  const parts = address.split(',').map(p => p.trim());
  
  // Look for Dublin district first
  for (const part of parts) {
    if (/Dublin\s*\d+/i.test(part)) {
      return part.replace(/,?\s*Dublin$/i, '').trim();
    }
  }
  
  // Look for known named areas (simplified - check for common area names)
  const normalizedAddress = address.toLowerCase();
  const commonAreas = [
    'Ballsbridge', 'Ranelagh', 'Rathmines', 'Donnybrook', 'Sandymount',
    'Blackrock', 'Dalkey', 'Killiney', 'Dundrum', 'Stillorgan',
    'Clontarf', 'Drumcondra', 'Glasnevin', 'Phibsborough', 'Smithfield',
    'Temple Bar', 'Rathgar', 'Terenure', 'Rathfarnham', 'Churchtown',
    'Goatstown', 'Milltown', 'Clonskeagh', 'Foxrock', 'Cabinteely',
    'Sandyford', 'Leopardstown', 'Carrickmines', 'Shankill', 'Killiney',
    'Malahide', 'Swords', 'Blanchardstown', 'Castleknock', 'Lucan',
    'Clondalkin', 'Tallaght', 'Finglas', 'Ballymun', 'Coolock',
    'Artane', 'Raheny', 'Howth', 'Sutton', 'Portmarnock'
  ];
  
  for (const area of commonAreas) {
    if (normalizedAddress.includes(area.toLowerCase())) {
      return area;
    }
  }
  
  // Fallback to second-to-last part
  if (parts.length >= 2) {
    const candidate = parts[parts.length - 2].replace(/Dublin\s*\d*/i, '').trim();
    const genericTerms = ['co', 'co.', 'county', 'dublin', ''];
    if (candidate && !genericTerms.includes(candidate.toLowerCase())) {
      return candidate;
    }
  }
  
  return 'Dublin';
}

function analyzeAreaImprovements(properties: Property[]): AreaStats[] {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const twelveMonthsAgo = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() - 6, 1);
  
  // Group properties by area
  const areaMap = new Map<string, Property[]>();
  
  properties.forEach(p => {
    const area = extractArea(p.address);
    if (!areaMap.has(area)) {
      areaMap.set(area, []);
    }
    areaMap.get(area)!.push(p);
  });
  
  const stats: AreaStats[] = [];
  
  areaMap.forEach((props, areaName) => {
    // Filter for recent (last 6 months) and older (6-12 months ago) properties
    const recent = props.filter(p => {
      const soldDate = new Date(p.soldDate);
      return soldDate >= sixMonthsAgo;
    });
    
    const older = props.filter(p => {
      const soldDate = new Date(p.soldDate);
      return soldDate >= twelveMonthsAgo && soldDate < sixMonthsAgo;
    });
    
    // Need at least 5 properties in each period for reliable comparison
    if (recent.length < 5 || older.length < 5) {
      return;
    }
    
    // Calculate medians
    const recentPrices = recent.map(p => p.soldPrice).sort((a, b) => a - b);
    const olderPrices = older.map(p => p.soldPrice).sort((a, b) => a - b);
    
    const recentMedian = recentPrices[Math.floor(recentPrices.length / 2)];
    const olderMedian = olderPrices[Math.floor(olderPrices.length / 2)];
    
    // Calculate percentage change
    const change6m = ((recentMedian - olderMedian) / olderMedian) * 100;
    
    // Calculate overall stats
    const allPrices = props.map(p => p.soldPrice).sort((a, b) => a - b);
    const medianPrice = allPrices[Math.floor(allPrices.length / 2)];
    
    const withSqm = props.filter(p => p.areaSqm && p.areaSqm > 0);
    const avgPricePerSqm = withSqm.length > 0
      ? Math.round(withSqm.reduce((sum, p) => sum + (p.soldPrice / (p.areaSqm || 1)), 0) / withSqm.length)
      : 0;
    
    stats.push({
      name: areaName,
      recentMedian,
      olderMedian,
      change6m: Math.round(change6m * 10) / 10,
      recentCount: recent.length,
      olderCount: older.length,
      totalCount: props.length,
      avgPricePerSqm,
      medianPrice,
    });
  });
  
  // Sort by improvement (descending)
  return stats.sort((a, b) => b.change6m - a.change6m);
}

async function main() {
  console.log('Loading property data...');
  
  // Try to load data.json from multiple possible locations
  const possiblePaths = [
    join(process.cwd(), 'dashboard', 'public', 'data.json'),
    join(process.cwd(), 'public', 'data.json'),
    join(process.cwd(), '..', 'dashboard', 'public', 'data.json'),
  ];
  
  let data: any = null;
  for (const path of possiblePaths) {
    try {
      const fileContent = readFileSync(path, 'utf-8');
      data = JSON.parse(fileContent);
      console.log(`Loaded data from ${path}`);
      break;
    } catch (err) {
      // Try next path
    }
  }
  
  if (!data || !data.properties) {
    console.error('Could not load property data. Tried paths:', possiblePaths);
    process.exit(1);
  }
  
  console.log(`Analyzing ${data.properties.length} properties...`);
  
  const areaStats = analyzeAreaImprovements(data.properties);
  
  console.log('\n=== Top 20 Areas with Biggest Price Improvement (Last 6 Months) ===\n');
  
  const top20 = areaStats.slice(0, 20);
  
  top20.forEach((area, index) => {
    console.log(`${index + 1}. ${area.name}`);
    console.log(`   Change: +${area.change6m.toFixed(1)}%`);
    console.log(`   Recent Median: €${area.recentMedian.toLocaleString()}`);
    console.log(`   Previous Median: €${area.olderMedian.toLocaleString()}`);
    console.log(`   Recent Sales: ${area.recentCount} | Previous Sales: ${area.olderCount}`);
    console.log(`   Overall Median: €${area.medianPrice.toLocaleString()}`);
    console.log(`   Avg Price/m²: €${area.avgPricePerSqm.toLocaleString()}`);
    console.log('');
  });
  
  // Save results to JSON for use in blog post
  const output = {
    generated: new Date().toISOString(),
    topAreas: top20.map(area => ({
      name: area.name,
      change6m: area.change6m,
      recentMedian: area.recentMedian,
      olderMedian: area.olderMedian,
      recentCount: area.recentCount,
      olderCount: area.olderCount,
      totalCount: area.totalCount,
      medianPrice: area.medianPrice,
      avgPricePerSqm: area.avgPricePerSqm,
    })),
  };
  
  const outputPath = join(process.cwd(), 'scripts', 'area-improvements-results.json');
  require('fs').writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nResults saved to ${outputPath}`);
}

main().catch(console.error);

