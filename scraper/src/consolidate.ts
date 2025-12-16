/**
 * Data Consolidation Script
 * 
 * Takes the 3 raw scraper outputs and produces a single unified data.json
 * with yield estimates calculated inline.
 * 
 * Input:
 *   - data/properties.json  (sold properties)
 *   - data/listings.json    (for-sale listings)
 *   - data/rentals.json     (rental listings)
 * 
 * Output:
 *   - data/data.json        (unified with yields)
 * 
 * Usage: npm run consolidate
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

// ============== Types ==============

type Confidence = 'high' | 'medium' | 'low' | 'very_low';

interface YieldEstimate {
  monthlyRent: number;
  grossYield: number;
  confidence: Confidence;
  source: 'eircode' | 'nearby' | 'area_average';
  dataPoints: number;
  searchRadius?: number;
  rentRange: { min: number; max: number };
  note: string;
}

interface RentalListing {
  address: string;
  monthlyRent: number;
  beds: number | null;
  baths: number | null;
  areaSqm: number | null;
  propertyType: string;
  berRating: string | null;
  furnishing: string | null;
  sourceUrl: string;
  sourcePage: number;
  latitude: number | null;
  longitude: number | null;
  eircode: string | null;
  nominatimAddress: string | null;
  rentPerSqm: number | null;
  rentPerBed: number | null;
  dublinPostcode: string | null;
  scrapedAt: string;
}

interface AreaStats {
  postcode: string;
  totalRentals: number;
  byBeds: Record<number, {
    count: number;
    avgRent: number;
    medianRent: number;
    minRent: number;
    maxRent: number;
  }>;
}

interface ConsolidatedData {
  properties: any[];
  listings: any[];
  rentals: RentalListing[];
  stats: {
    generated: string;
    propertiesCount: number;
    listingsCount: number;
    rentalsCount: number;
    yieldCoverage: {
      properties: number;
      listings: number;
    };
  };
}

// ============== Utility Functions ==============

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

function extractDublinPostcode(address: string): string | null {
  const match = address.match(/Dublin\s*(\d{1,2}W?)|D(\d{1,2}W?)/i);
  if (match) {
    const code = match[1] || match[2];
    return `D${code.toUpperCase()}`;
  }
  return null;
}

function median(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateConfidence(source: 'eircode' | 'nearby' | 'area_average', dataPoints: number): Confidence {
  if (source === 'eircode') return 'high';
  
  if (source === 'nearby') {
    if (dataPoints >= 10) return 'high';
    if (dataPoints >= 5) return 'medium';
    if (dataPoints >= 3) return 'low';
    return 'very_low';
  }
  
  if (dataPoints >= 30) return 'medium';
  if (dataPoints >= 15) return 'low';
  return 'very_low';
}

function generateNote(source: 'eircode' | 'nearby' | 'area_average', dataPoints: number, postcode?: string, beds?: number | null): string {
  if (source === 'eircode') {
    return `Exact eircode match with ${dataPoints} rental${dataPoints > 1 ? 's' : ''} at this location`;
  }
  
  if (source === 'nearby') {
    const bedsStr = beds ? `${beds}-bed ` : '';
    return `Based on ${dataPoints} ${bedsStr}rental${dataPoints > 1 ? 's' : ''} within 500m`;
  }
  
  const bedsStr = beds ? `${beds}-bed ` : '';
  return `Area average: ${dataPoints} ${bedsStr}rentals in ${postcode || 'area'}`;
}

// ============== Yield Estimation ==============

function estimateYield(
  property: {
    price: number;
    beds: number | null;
    latitude: number | null;
    longitude: number | null;
    eircode: string | null;
    address: string;
    dublinPostcode: string | null;
  },
  rentalsByEircode: Map<string, { rent: number; beds: number | null }[]>,
  geocodedRentals: RentalListing[],
  areaStats: Map<string, AreaStats>
): YieldEstimate | null {
  
  const postcode = property.dublinPostcode || extractDublinPostcode(property.address);
  
  // Strategy 1: Exact Eircode match WITH bedroom matching
  if (property.eircode && property.beds) {
    const key = property.eircode.replace(/\s/g, '').toUpperCase();
    const rentalsAtEircode = rentalsByEircode.get(key);
    
    if (rentalsAtEircode && rentalsAtEircode.length >= 1) {
      // First try: exact bedroom match
      const exactBedMatch = rentalsAtEircode.filter(r => r.beds === property.beds);
      
      // Second try: similar bedrooms (within 1)
      const similarBedMatch = rentalsAtEircode.filter(r => 
        r.beds !== null && property.beds !== null && 
        Math.abs(r.beds - property.beds) <= 1
      );
      
      // Use exact match if available, otherwise similar match
      const matchedRentals = exactBedMatch.length > 0 ? exactBedMatch : 
                            similarBedMatch.length > 0 ? similarBedMatch : [];
      
      if (matchedRentals.length >= 1) {
        const rents = matchedRentals.map(r => r.rent);
        const rent = Math.round(median(rents));
        const grossYield = Math.round((rent * 12 / property.price) * 10000) / 100;
        const matchType = exactBedMatch.length > 0 ? 'exact' : 'similar';
        return {
          monthlyRent: rent,
          grossYield,
          confidence: calculateConfidence('eircode', rents.length),
          source: 'eircode',
          dataPoints: rents.length,
          rentRange: { min: Math.min(...rents), max: Math.max(...rents) },
          note: `Eircode match: ${rents.length} ${matchType} ${property.beds}-bed rental${rents.length > 1 ? 's' : ''}`
        };
      }
      // If no bedroom match at eircode, fall through to nearby/area strategies
    }
  }
  
  // Strategy 2: Nearby rentals (within 1km, same bed count)
  if (property.latitude && property.longitude && property.beds) {
    const nearby = geocodedRentals.filter(r => {
      if (r.beds !== property.beds) return false;
      const dist = haversineDistance(
        property.latitude!, property.longitude!,
        r.latitude!, r.longitude!
      );
      return dist <= 1000; // 1km radius
    });
    
    if (nearby.length >= 2) {
      const rents = nearby.map(r => r.monthlyRent);
      const rent = Math.round(median(rents));
      const grossYield = Math.round((rent * 12 / property.price) * 10000) / 100;
      return {
        monthlyRent: rent,
        grossYield,
        confidence: calculateConfidence('nearby', rents.length),
        source: 'nearby',
        dataPoints: rents.length,
        searchRadius: 1000,
        rentRange: { min: Math.min(...rents), max: Math.max(...rents) },
        note: `Based on ${rents.length} ${property.beds}-bed rentals within 1km`
      };
    }
  }
  
  // Strategy 3: Area average (postcode + beds)
  if (postcode && property.beds) {
    const areaData = areaStats.get(postcode);
    if (areaData && areaData.byBeds[property.beds]) {
      const bedData = areaData.byBeds[property.beds];
      if (bedData.count >= 3) {
        const rent = bedData.medianRent;
        const grossYield = Math.round((rent * 12 / property.price) * 10000) / 100;
        return {
          monthlyRent: rent,
          grossYield,
          confidence: calculateConfidence('area_average', bedData.count),
          source: 'area_average',
          dataPoints: bedData.count,
          rentRange: { min: bedData.minRent, max: bedData.maxRent },
          note: generateNote('area_average', bedData.count, postcode, property.beds)
        };
      }
    }
  }
  
  // Strategy 4: Area average without bed filter (last resort)
  if (postcode) {
    const areaData = areaStats.get(postcode);
    if (areaData && areaData.totalRentals >= 5) {
      const allRents: number[] = [];
      for (const bedData of Object.values(areaData.byBeds)) {
        allRents.push(bedData.medianRent);
      }
      if (allRents.length > 0) {
        const rent = Math.round(median(allRents));
        const grossYield = Math.round((rent * 12 / property.price) * 10000) / 100;
        return {
          monthlyRent: rent,
          grossYield,
          confidence: 'very_low',
          source: 'area_average',
          dataPoints: areaData.totalRentals,
          rentRange: { 
            min: Math.min(...Object.values(areaData.byBeds).map(b => b.minRent)),
            max: Math.max(...Object.values(areaData.byBeds).map(b => b.maxRent))
          },
          note: `Area average: ${areaData.totalRentals} rentals in ${postcode} (mixed bed types)`
        };
      }
    }
  }
  
  return null;
}

// ============== Build Area Stats ==============

function buildAreaStats(rentals: RentalListing[]): Map<string, AreaStats> {
  const stats = new Map<string, AreaStats>();
  
  for (const rental of rentals) {
    const postcode = rental.dublinPostcode || extractDublinPostcode(rental.address);
    if (!postcode) continue;
    
    if (!stats.has(postcode)) {
      stats.set(postcode, {
        postcode,
        totalRentals: 0,
        byBeds: {}
      });
    }
    
    const area = stats.get(postcode)!;
    area.totalRentals++;
    
    if (rental.beds) {
      if (!area.byBeds[rental.beds]) {
        area.byBeds[rental.beds] = {
          count: 0,
          avgRent: 0,
          medianRent: 0,
          minRent: Infinity,
          maxRent: 0
        };
      }
      const bedStats = area.byBeds[rental.beds];
      bedStats.count++;
      bedStats.minRent = Math.min(bedStats.minRent, rental.monthlyRent);
      bedStats.maxRent = Math.max(bedStats.maxRent, rental.monthlyRent);
    }
  }
  
  // Calculate medians
  for (const [postcode, area] of stats) {
    for (const beds of Object.keys(area.byBeds)) {
      const bedNum = parseInt(beds);
      const rentalsForBed = rentals.filter(r => 
        (r.dublinPostcode || extractDublinPostcode(r.address)) === postcode && 
        r.beds === bedNum
      );
      const rents = rentalsForBed.map(r => r.monthlyRent);
      
      if (rents.length > 0) {
        area.byBeds[bedNum].avgRent = Math.round(rents.reduce((a, b) => a + b, 0) / rents.length);
        area.byBeds[bedNum].medianRent = Math.round(median(rents));
      }
    }
  }
  
  return stats;
}

// ============== Main Consolidation ==============

async function consolidate() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║               DATA CONSOLIDATION SCRIPT                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Check input files
  const hasProperties = existsSync('./data/properties.json');
  const hasListings = existsSync('./data/listings.json');
  const hasRentals = existsSync('./data/rentals.json');

  console.log('📁 Input files:');
  console.log(`   properties.json: ${hasProperties ? '✓' : '✗'}`);
  console.log(`   listings.json:   ${hasListings ? '✓' : '✗'}`);
  console.log(`   rentals.json:    ${hasRentals ? '✓' : '✗'}\n`);

  // Load data
  const properties: any[] = hasProperties 
    ? JSON.parse(readFileSync('./data/properties.json', 'utf-8'))
    : [];
  const listings: any[] = hasListings 
    ? JSON.parse(readFileSync('./data/listings.json', 'utf-8'))
    : [];
  const rentals: RentalListing[] = hasRentals 
    ? JSON.parse(readFileSync('./data/rentals.json', 'utf-8'))
    : [];

  console.log(`📊 Data loaded:`);
  console.log(`   ${properties.length.toLocaleString()} sold properties`);
  console.log(`   ${listings.length.toLocaleString()} for-sale listings`);
  console.log(`   ${rentals.length.toLocaleString()} rental listings\n`);

  // Build rental lookup structures for yield calculation
  let propertiesWithYield = 0;
  let listingsWithYield = 0;

  if (rentals.length > 0) {
    console.log('🔍 Building yield estimation structures...');
    
    const areaStats = buildAreaStats(rentals);
    const rentalsByEircode = new Map<string, { rent: number; beds: number | null }[]>();
    const geocodedRentals = rentals.filter(r => r.latitude && r.longitude);

    for (const rental of rentals) {
      if (rental.eircode) {
        const key = rental.eircode.replace(/\s/g, '').toUpperCase();
        if (!rentalsByEircode.has(key)) rentalsByEircode.set(key, []);
        // Store both rent AND bedroom count for smarter matching
        rentalsByEircode.get(key)!.push({ rent: rental.monthlyRent, beds: rental.beds });
      }
    }

    console.log(`   Eircodes with rentals: ${rentalsByEircode.size}`);
    console.log(`   Geocoded rentals:      ${geocodedRentals.length}`);
    console.log(`   Areas covered:         ${areaStats.size}\n`);

    // Calculate yields for properties
    console.log('📈 Calculating yields for sold properties...');
    for (const prop of properties) {
      const price = prop.soldPrice;
      const postcode = extractDublinPostcode(prop.address);
      prop.dublinPostcode = postcode;
      
      if (!price || price <= 0) {
        prop.yieldEstimate = null;
        continue;
      }
      
      const beds = prop.beds ?? prop.bedrooms ?? null;
      
      const estimate = estimateYield(
        {
          price,
          beds,
          latitude: prop.latitude,
          longitude: prop.longitude,
          eircode: prop.eircode,
          address: prop.address,
          dublinPostcode: postcode
        },
        rentalsByEircode,
        geocodedRentals,
        areaStats
      );
      
      if (estimate) {
        prop.yieldEstimate = estimate;
        propertiesWithYield++;
      } else {
        prop.yieldEstimate = null;
      }
    }
    console.log(`   ✓ ${propertiesWithYield.toLocaleString()} properties with yield estimates (${(propertiesWithYield / properties.length * 100).toFixed(1)}%)`);

    // Calculate yields for listings
    console.log('📈 Calculating yields for for-sale listings...');
    for (const listing of listings) {
      const price = listing.askingPrice;
      const postcode = extractDublinPostcode(listing.address);
      listing.dublinPostcode = postcode;
      
      if (!price || price <= 0) {
        listing.yieldEstimate = null;
        continue;
      }
      
      const beds = listing.beds ?? null;
      
      const estimate = estimateYield(
        {
          price,
          beds,
          latitude: listing.latitude,
          longitude: listing.longitude,
          eircode: listing.eircode,
          address: listing.address,
          dublinPostcode: postcode
        },
        rentalsByEircode,
        geocodedRentals,
        areaStats
      );
      
      if (estimate) {
        listing.yieldEstimate = estimate;
        listingsWithYield++;
      } else {
        listing.yieldEstimate = null;
      }
    }
    console.log(`   ✓ ${listingsWithYield.toLocaleString()} listings with yield estimates (${(listingsWithYield / listings.length * 100).toFixed(1)}%)\n`);
  } else {
    console.log('⚠️  No rental data available - yields will not be calculated\n');
    // Set null yields
    for (const prop of properties) {
      prop.yieldEstimate = null;
    }
    for (const listing of listings) {
      listing.yieldEstimate = null;
    }
  }

  // Build output
  const output: ConsolidatedData = {
    properties,
    listings,
    rentals,
    stats: {
      generated: new Date().toISOString(),
      propertiesCount: properties.length,
      listingsCount: listings.length,
      rentalsCount: rentals.length,
      yieldCoverage: {
        properties: properties.length > 0 ? Math.round(propertiesWithYield / properties.length * 100) : 0,
        listings: listings.length > 0 ? Math.round(listingsWithYield / listings.length * 100) : 0,
      },
    },
  };

  // Write output
  writeFileSync('./data/data.json', JSON.stringify(output, null, 2));

  console.log('═'.repeat(60));
  console.log('✅ CONSOLIDATION COMPLETE');
  console.log('═'.repeat(60));
  console.log(`
📦 Output: ./data/data.json

📊 Summary:
   Properties:  ${properties.length.toLocaleString().padStart(8)} (${output.stats.yieldCoverage.properties}% with yields)
   Listings:    ${listings.length.toLocaleString().padStart(8)} (${output.stats.yieldCoverage.listings}% with yields)
   Rentals:     ${rentals.length.toLocaleString().padStart(8)}

💡 To update the dashboard:
   1. Restart the Next.js dev server
   2. Or run: npm run dev (in dashboard folder)
`);
}

// Run
consolidate().catch(console.error);

