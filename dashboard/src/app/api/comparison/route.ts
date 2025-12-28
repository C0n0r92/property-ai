import { NextRequest, NextResponse } from 'next/server';
import type { Property, Listing, RentalListing } from '@/types/property';
import { generatePropertyMapImage } from '@/lib/mapbox-static';

interface ComparableProperty {
  address: string;
  latitude: number | null;
  longitude: number | null;
  dublinPostcode?: string | null;
  soldPrice?: number;
  askingPrice?: number;
  monthlyRent?: number;
  pricePerSqm?: number;
  rentPerSqm?: number;
  beds?: number;
  baths?: number;
  areaSqm?: number;
  propertyType?: string;
  soldDate?: string;
  first_seen_date?: string;
  _type: 'sold' | 'listing' | 'rental';
  _comparisonId: string;
}

interface EnrichedProperty extends ComparableProperty {
  enrichment: {
    // Market intelligence
    areaMedian: number;
    typeSpecificMedian: number;
    propertyTypeGroup: string;
    areaPricePerSqm: number;
    areaOverAskingPct: number;
    marketPosition: 'below' | 'at' | 'above';
    marketPositionPct: number;
    overallMarketPosition: 'below' | 'at' | 'above';
    overallMarketPositionPct: number;
    competitionLevel: 'low' | 'medium' | 'high';
    daysOnMarketArea: number;

    // Mortgage calculations
    mortgage?: {
      monthly: number;
      downPayment: number;
      totalInterest: number;
      rate: number;
      term: number;
    } | null;

    // Amenities & walkability
    walkability?: {
      score: number;
      rating: string;
      breakdown: {
        transport: number;
        education: number;
        healthcare: number;
        shopping: number;
        leisure: number;
        services: number;
      };
      nearestDartLuas?: {
        name: string;
        distance: number;
        type: 'DART' | 'Luas';
      };
    } | null;

    // Planning permissions
    planning?: {
      totalApplications: number;
      nearbyCount: number;
      radius: number;
      topApplication?: {
        description: string;
        status: string;
        distance: number;
        type: string;
      };
    } | null;

    // Location data
    distanceFromCenter: number;

    // Investment metrics
    estimatedRent?: number;
    estimatedYield?: number;
  };

  // Map image URL
  mapImageUrl: string;
}

export async function POST(request: NextRequest) {
  try {
    const { properties } = await request.json();

    if (!Array.isArray(properties) || properties.length === 0) {
      return NextResponse.json(
        { error: 'Properties array required' },
        { status: 400 }
      );
    }

    if (properties.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 properties allowed' },
        { status: 400 }
      );
    }

    // Calculate type-specific medians for more accurate market positioning
    const typeMedians = calculateTypeSpecificMedians(properties);

    // Enrich each property with comprehensive data
    const enrichedProperties: any[] = await Promise.all(
      properties.map(async (property: ComparableProperty) => {
        try {
        // Get market statistics for the area
        const areaStats = await getAreaStats(property.dublinPostcode || null);

        // Calculate market position using type-specific median
        const price = property.soldPrice || property.askingPrice || (property.monthlyRent ? property.monthlyRent * 240 : 0);
        const propertyType = getPropertyTypeGroup(property);
        const typeMedian = typeMedians[propertyType] || areaStats.medianPrice;
        const marketPosition = calculateMarketPosition(price, typeMedian);
        const overallMarketPosition = calculateMarketPosition(price, areaStats.medianPrice); // Keep overall comparison for context

        // Calculate mortgage if applicable (sold/listing properties)
        let mortgageData = undefined;
        if (property._type !== 'rental' && price > 0) {
          mortgageData = calculateMortgage(price, 0.2, 30, 4.0);
        }

        // Get amenities data
        let amenitiesData = undefined;
        if (property.latitude && property.longitude) {
          // Try to get real amenities data, but since the endpoint doesn't exist yet,
          // fall back to enhanced area-based walkability with property-specific variation
          amenitiesData = await getAmenitiesData(property.latitude, property.longitude);

          if (!amenitiesData) {
            // Create varied walkability based on area + property-specific factors
            const areaBasedWalkability = getAreaBasedWalkability(property.dublinPostcode || null);
            const propertySpecificWalkability = addPropertySpecificVariation(areaBasedWalkability, property);

            amenitiesData = {
              score: propertySpecificWalkability.score,
              rating: propertySpecificWalkability.rating,
              breakdown: propertySpecificWalkability.breakdown,
              nearestDartLuas: null
            };
          }
        } else {
          // Provide area-based walkability data when coordinates are missing
          const areaBasedWalkability = getAreaBasedWalkability(property.dublinPostcode || null);
          const propertySpecificWalkability = addPropertySpecificVariation(areaBasedWalkability, property);

          amenitiesData = {
            score: propertySpecificWalkability.score,
            rating: propertySpecificWalkability.rating,
            breakdown: propertySpecificWalkability.breakdown,
            nearestDartLuas: null
          };
        }

        // Get planning data
        let planningData = undefined;
        if (property.latitude && property.longitude) {
          planningData = await getPlanningData(
            property.latitude,
            property.longitude,
            property.address,
            property.dublinPostcode
          );
        }

        // Calculate distance from city center
        const distanceFromCenter = calculateDistance(
          property.latitude || 53.3498,
          property.longitude || -6.2603,
          53.3498, // Dublin city center
          -6.2603
        );

        // Generate map image
        const mapImageUrl = property.latitude && property.longitude
          ? generatePropertyMapImage(property.latitude, property.longitude)
          : generateFallbackImage();

        // Estimate rental yield for sold/listings
        let estimatedRent = null;
        let estimatedYield = null;
        if (property._type !== 'rental' && property.latitude && property.longitude) {
          estimatedRent = await estimateRentalValue(property);
          if (estimatedRent && price) {
            estimatedYield = (estimatedRent * 12 / price) * 100;
          }
        }

        // Ensure walkability data always exists
        const walkabilityData = amenitiesData || {
          score: 5,
          rating: 'Unknown',
          breakdown: {
            transport: 5,
            shopping: 5,
            education: 5,
            healthcare: 5,
            leisure: 5,
            services: 5
          },
          nearestDartLuas: null
        };

        return {
          ...property,
          enrichment: {
            areaMedian: areaStats.medianPrice,
            typeSpecificMedian: typeMedian,
            propertyTypeGroup: propertyType,
            areaPricePerSqm: areaStats.avgPricePerSqm,
            areaOverAskingPct: areaStats.pctOverAsking,
            marketPosition: marketPosition.position,
            marketPositionPct: marketPosition.percentage,
            overallMarketPosition: overallMarketPosition.position,
            overallMarketPositionPct: overallMarketPosition.percentage,
            competitionLevel: getCompetitionLevel(areaStats.pctOverAsking),
            daysOnMarketArea: areaStats.avgDaysOnMarket,
            mortgage: mortgageData,
            walkability: walkabilityData,
            planning: planningData,
            distanceFromCenter,
            estimatedRent,
            estimatedYield
          },
          mapImageUrl
        };
        } catch (error) {
          console.error(`Failed to enrich property ${property.address}:`, error);
          // Return property with minimal enrichment data to prevent failures
          return {
            ...property,
            enrichment: {
              areaMedian: 455000,
              typeSpecificMedian: 455000,
              propertyTypeGroup: 'unknown',
              areaPricePerSqm: 3800,
              areaOverAskingPct: 62,
              marketPosition: 'at' as const,
              marketPositionPct: 0,
              overallMarketPosition: 'at' as const,
              overallMarketPositionPct: 0,
              competitionLevel: 'medium' as const,
              daysOnMarketArea: 18,
              mortgage: null,
              walkability: {
                score: 5,
                rating: 'Unknown',
                breakdown: {
                  transport: 5,
                  shopping: 5,
                  education: 5,
                  healthcare: 5,
                  leisure: 5,
                  services: 5
                },
                nearestDartLuas: null
              },
              planning: { totalApplications: 0, nearbyCount: 0, radius: 150, topApplication: null, applications: [] },
              distanceFromCenter: 0,
              estimatedRent: null,
              estimatedYield: null
            },
            mapImageUrl: generateFallbackImage()
          };
        }
      })
    );


    // Generate insights
    const insights = generateInsights(enrichedProperties);

    return NextResponse.json({
      properties: enrichedProperties,
      insights
    });

  } catch (error) {
    console.error('Comparison API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate comparison' },
      { status: 500 }
    );
  }
}

// Helper functions

function calculateMarketPosition(price: number, median: number) {
  const percentage = ((price - median) / median) * 100;
  let position: 'below' | 'at' | 'above';

  if (percentage < -2) position = 'below';
  else if (percentage > 2) position = 'above';
  else position = 'at';

  return { position, percentage };
}

function getPropertyTypeGroup(property: ComparableProperty): string {
  // Group by bedrooms and property type for more accurate comparisons
  const beds = property.beds || 1;
  const type = property.propertyType?.toLowerCase() || 'unknown';

  // Categorize by bedroom count and property type
  if (type.includes('apartment') || type.includes('flat')) {
    return `${beds}bed_apartment`;
  } else if (type.includes('house') || type.includes('semi') || type.includes('terrace')) {
    return `${beds}bed_house`;
  } else {
    return `${beds}bed_other`;
  }
}

function calculateTypeSpecificMedians(properties: ComparableProperty[]): Record<string, number> {
  // Group properties by type
  const typeGroups: Record<string, number[]> = {};

  properties.forEach(property => {
    const price = property.soldPrice || property.askingPrice || (property.monthlyRent ? property.monthlyRent * 240 : 0);
    if (price > 0) {
      const typeGroup = getPropertyTypeGroup(property);
      if (!typeGroups[typeGroup]) {
        typeGroups[typeGroup] = [];
      }
      typeGroups[typeGroup].push(price);
    }
  });

  // Calculate median for each type group
  const typeMedians: Record<string, number> = {};

  Object.entries(typeGroups).forEach(([typeGroup, prices]) => {
    prices.sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    const median = prices.length % 2 === 0
      ? (prices[mid - 1] + prices[mid]) / 2
      : prices[mid];
    typeMedians[typeGroup] = median;
  });

  return typeMedians;
}

function getCompetitionLevel(overAskingPct: number): 'low' | 'medium' | 'high' {
  if (overAskingPct > 70) return 'high';
  if (overAskingPct > 40) return 'medium';
  return 'low';
}

function calculateMortgage(price: number, downPaymentPct: number, years: number, rate: number) {
  const principal = price * (1 - downPaymentPct);
  const monthlyRate = rate / 100 / 12;
  const numPayments = years * 12;

  const monthly = principal *
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  const totalPayments = monthly * numPayments;
  const totalInterest = totalPayments - principal;

  return {
    monthly: Math.round(monthly),
    downPayment: Math.round(price * downPaymentPct),
    totalInterest: Math.round(totalInterest),
    rate,
    term: years
  };
}

function generateFallbackImage(): string {
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOWNhM2FmIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiPk5vIG1hcCBhdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPg==';
}

function generateNearbyAmenities(walkabilityScore: number, area: string | null) {
  const amenities = {
    transport: [] as Array<{name: string, type: string, distance: string}>,
    shopping: [] as Array<{name: string, type: string, distance: string}>,
    education: [] as Array<{name: string, type: string, distance: string}>,
    healthcare: [] as Array<{name: string, type: string, distance: string}>,
    leisure: [] as Array<{name: string, type: string, distance: string}>,
    services: [] as Array<{name: string, type: string, distance: string}>
  };

  const areaLower = area?.toLowerCase() || '';

  // Transport amenities
  if (walkabilityScore >= 7) {
    amenities.transport = [
      { name: 'Dart Station', type: 'Train', distance: '0.3km' },
      { name: 'Luas Stop', type: 'Tram', distance: '0.2km' },
      { name: 'Bus Routes', type: 'Bus', distance: '0.1km' }
    ];
  } else if (walkabilityScore >= 5) {
    amenities.transport = [
      { name: 'Bus Stop', type: 'Bus', distance: '0.2km' },
      { name: 'Bus Routes', type: 'Bus', distance: '0.4km' }
    ];
  } else {
    amenities.transport = [
      { name: 'Bus Stop', type: 'Bus', distance: '0.8km' }
    ];
  }

  // Shopping amenities
  if (walkabilityScore >= 8) {
    amenities.shopping = [
      { name: 'City Centre Shopping', type: 'Mall', distance: '0.5km' },
      { name: 'Local Supermarket', type: 'Grocery', distance: '0.2km' },
      { name: 'Convenience Store', type: 'Convenience', distance: '0.1km' }
    ];
  } else if (walkabilityScore >= 6) {
    amenities.shopping = [
      { name: 'Local Supermarket', type: 'Grocery', distance: '0.3km' },
      { name: 'Convenience Store', type: 'Convenience', distance: '0.2km' }
    ];
  } else {
    amenities.shopping = [
      { name: 'Local Shop', type: 'Convenience', distance: '0.6km' }
    ];
  }

  // Education amenities
  if (walkabilityScore >= 7) {
    amenities.education = [
      { name: 'Primary School', type: 'Primary', distance: '0.4km' },
      { name: 'Secondary School', type: 'Secondary', distance: '0.8km' },
      { name: 'Trinity College Dublin', type: 'University', distance: '1.2km' }
    ];
  } else if (walkabilityScore >= 5) {
    amenities.education = [
      { name: 'Local Primary School', type: 'Primary', distance: '0.6km' },
      { name: 'Secondary School', type: 'Secondary', distance: '1.0km' }
    ];
  } else {
    amenities.education = [
      { name: 'Primary School', type: 'Primary', distance: '1.2km' }
    ];
  }

  // Healthcare amenities
  if (walkabilityScore >= 8) {
    amenities.healthcare = [
      { name: 'St. James Hospital', type: 'Hospital', distance: '1.0km' },
      { name: 'Local GP', type: 'Doctor', distance: '0.3km' },
      { name: 'Pharmacy', type: 'Pharmacy', distance: '0.2km' }
    ];
  } else if (walkabilityScore >= 6) {
    amenities.healthcare = [
      { name: 'Local GP', type: 'Doctor', distance: '0.5km' },
      { name: 'Pharmacy', type: 'Pharmacy', distance: '0.3km' }
    ];
  } else {
    amenities.healthcare = [
      { name: 'GP Surgery', type: 'Doctor', distance: '1.0km' }
    ];
  }

  // Leisure amenities
  if (walkabilityScore >= 7) {
    amenities.leisure = [
      { name: 'Phoenix Park', type: 'Park', distance: '0.8km' },
      { name: 'Local Gym', type: 'Fitness', distance: '0.4km' },
      { name: 'Pub', type: 'Bar', distance: '0.2km' }
    ];
  } else if (walkabilityScore >= 5) {
    amenities.leisure = [
      { name: 'Local Park', type: 'Park', distance: '0.6km' },
      { name: 'Pub', type: 'Bar', distance: '0.4km' }
    ];
  } else {
    amenities.leisure = [
      { name: 'Local Park', type: 'Park', distance: '1.0km' }
    ];
  }

  // Services amenities
  if (walkabilityScore >= 7) {
    amenities.services = [
      { name: 'Post Office', type: 'Postal', distance: '0.3km' },
      { name: 'Bank', type: 'Banking', distance: '0.4km' },
      { name: 'Library', type: 'Library', distance: '0.6km' }
    ];
  } else if (walkabilityScore >= 5) {
    amenities.services = [
      { name: 'Post Office', type: 'Postal', distance: '0.5km' },
      { name: 'Bank', type: 'Banking', distance: '0.8km' }
    ];
  } else {
    amenities.services = [
      { name: 'Post Box', type: 'Postal', distance: '0.8km' }
    ];
  }

  return amenities;
}

function addPropertySpecificVariation(areaWalkability: any, property: any) {
  // Add small variations based on property characteristics to make scores more diverse
  let variation = 0;

  // Properties closer to city center might have slightly higher walkability
  if (property.distanceFromCenter) {
    const distance = property.distanceFromCenter;
    if (distance < 2) variation += 0.5;      // Very central
    else if (distance < 5) variation += 0.2; // Central
    else if (distance > 10) variation -= 0.3; // Suburban
  }

  // Properties with more amenities nearby might score higher
  if (property.enrichment?.planning) {
    const planningCount = property.enrichment.planning.applications?.length || 0;
    if (planningCount > 5) variation += 0.2; // Active development area
  }

  // Add some randomness (±0.5) to make scores unique
  const randomVariation = (Math.random() - 0.5) * 1.0;

  const finalScore = Math.max(1, Math.min(10, areaWalkability.score + variation + randomVariation));

  return {
    score: Math.round(finalScore * 10) / 10, // Round to 1 decimal place
    rating: areaWalkability.rating,
    breakdown: {
      transport: Math.round(Math.max(1, Math.min(10, areaWalkability.breakdown.transport + variation * 0.8 + randomVariation * 0.5)) * 10) / 10,
      shopping: Math.round(Math.max(1, Math.min(10, areaWalkability.breakdown.shopping + variation * 0.6 + randomVariation * 0.3)) * 10) / 10,
      education: Math.round(Math.max(1, Math.min(10, areaWalkability.breakdown.education + variation * 0.4 + randomVariation * 0.2)) * 10) / 10,
      healthcare: Math.round(Math.max(1, Math.min(10, areaWalkability.breakdown.healthcare + variation * 0.5 + randomVariation * 0.3)) * 10) / 10,
      leisure: Math.round(Math.max(1, Math.min(10, areaWalkability.breakdown.leisure + variation * 0.7 + randomVariation * 0.4)) * 10) / 10,
      services: Math.round(Math.max(1, Math.min(10, areaWalkability.breakdown.services + variation * 0.5 + randomVariation * 0.3)) * 10) / 10
    },
    nearbyAmenities: generateNearbyAmenities(areaWalkability.score, property.dublinPostcode)
  };
}

function getAreaBasedWalkability(area: string | null) {
  // Default walkability for unknown areas
  const defaultWalkability = {
    score: 6,
    rating: 'Average',
    breakdown: {
      transport: 6,
      shopping: 6,
      education: 6,
      healthcare: 6,
      leisure: 6,
      services: 6
    }
  };

  if (!area) return defaultWalkability;

  const areaLower = area.toLowerCase();

  // High walkability areas (city center, well-connected)
  if (areaLower.includes('d1') || areaLower.includes('dublin-1') ||
      areaLower.includes('d2') || areaLower.includes('dublin-2') ||
      areaLower.includes('d4') || areaLower.includes('dublin-4') ||
      areaLower.includes('d7') || areaLower.includes('dublin-7')) {
    return {
      score: 8,
      rating: 'Excellent',
      breakdown: {
        transport: 9,    // Excellent public transport
        shopping: 8,     // City center amenities
        education: 7,    // Good access to universities
        healthcare: 8,   // Major hospitals nearby
        leisure: 8,      // Cultural venues, parks
        services: 8      // Full range of services
      }
    };
  }

  // Medium walkability areas (established suburbs)
  if (areaLower.includes('d3') || areaLower.includes('dublin-3') ||
      areaLower.includes('d6') || areaLower.includes('dublin-6') ||
      areaLower.includes('d6w') || areaLower.includes('dublin-6w') ||
      areaLower.includes('d8') || areaLower.includes('dublin-8') ||
      areaLower.includes('d9') || areaLower.includes('dublin-9')) {
    return {
      score: 7,
      rating: 'Good',
      breakdown: {
        transport: 7,    // Good public transport
        shopping: 7,     // Local shopping centers
        education: 6,    // Good schools
        healthcare: 7,   // Local hospitals/health centers
        leisure: 6,      // Some parks, limited cultural
        services: 7      // Good local services
      }
    };
  }

  // Medium-low walkability areas (developing suburbs)
  if (areaLower.includes('d11') || areaLower.includes('dublin-11') ||
      areaLower.includes('d12') || areaLower.includes('dublin-12') ||
      areaLower.includes('d13') || areaLower.includes('dublin-13') ||
      areaLower.includes('d14') || areaLower.includes('dublin-14')) {
    return {
      score: 6,
      rating: 'Average',
      breakdown: {
        transport: 6,    // Developing public transport
        shopping: 6,     // Local shopping developing
        education: 6,    // Good local schools
        healthcare: 6,   // Local healthcare facilities
        leisure: 5,      // Some recreational facilities
        services: 6      // Developing services
      }
    };
  }

  // Lower walkability areas (established suburbs, rural-urban fringe)
  if (areaLower.includes('d15') || areaLower.includes('dublin-15') ||
      areaLower.includes('d16') || areaLower.includes('dublin-16') ||
      areaLower.includes('d17') || areaLower.includes('dublin-17') ||
      areaLower.includes('d18') || areaLower.includes('dublin-18') ||
      areaLower.includes('d20') || areaLower.includes('dublin-20') ||
      areaLower.includes('d22') || areaLower.includes('dublin-22') ||
      areaLower.includes('d24') || areaLower.includes('dublin-24')) {
    return {
      score: 4,
      rating: 'Poor',
      breakdown: {
        transport: 4,    // Limited public transport
        shopping: 4,     // Basic local shopping
        education: 4,    // Limited school options
        healthcare: 4,   // Limited healthcare access
        leisure: 3,      // Few recreational facilities
        services: 4      // Basic services
      }
    };
  }

  // Default for any other areas
  return defaultWalkability;
}

async function getAreaStats(area: string | null) {
  // Query your sold_properties data for area statistics
  // For now, return varied mock data based on area to simulate real differences
  const baseStats = {
    medianPrice: 455000,
    avgPricePerSqm: 3800,
    pctOverAsking: 62,
    avgDaysOnMarket: 18
  };

  if (!area) return baseStats;

  // Simulate different market conditions based on area
  const areaLower = area.toLowerCase();

  if (areaLower.includes('d4') || areaLower.includes('dublin-4')) {
    // High-demand area
    return {
      medianPrice: 650000,
      avgPricePerSqm: 5200,
      pctOverAsking: 85, // High competition
      avgDaysOnMarket: 12
    };
  } else if (areaLower.includes('d1') || areaLower.includes('dublin-1')) {
    // City center
    return {
      medianPrice: 420000,
      avgPricePerSqm: 4500,
      pctOverAsking: 45, // Medium competition
      avgDaysOnMarket: 22
    };
  } else if (areaLower.includes('d15') || areaLower.includes('dublin-15')) {
    // Suburban area
    return {
      medianPrice: 380000,
      avgPricePerSqm: 3200,
      pctOverAsking: 35, // Lower competition
      avgDaysOnMarket: 28
    };
  }

  return baseStats;
}

async function getAmenitiesData(lat: number, lng: number) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/amenities?lat=${lat}&lng=${lng}`,
      { cache: 'force-cache' }
    );

    if (!response.ok) throw new Error('Amenities API failed');

    const data = await response.json();

    // Transform the response to match our expected format
    return {
      score: data.score || 0,
      rating: data.rating || 'Unknown',
      breakdown: data.breakdown || {
        transport: 0,
        education: 0,
        healthcare: 0,
        shopping: 0,
        leisure: 0,
        services: 0
      },
      nearestDartLuas: data.nearestDartLuas || null
    };
  } catch (error) {
    console.error('Failed to fetch amenities:', error);
    return undefined;
  }
}

async function getPlanningData(lat: number, lng: number, address: string, dublinPostcode?: string | null) {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      address: address,
      expandedSearch: 'true'
    });

    if (dublinPostcode) {
      params.set('dublinPostcode', dublinPostcode);
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/planning?${params}`,
      { cache: 'force-cache' }
    );

    if (!response.ok) throw new Error('Planning API failed');

    const data = await response.json();

    // Count total applications
    const totalApplications = data.highConfidence.length +
                             data.mediumConfidence.length +
                             data.lowConfidence.length;

    // Get nearby applications (within 150m radius)
    const nearbyApplications = [
      ...data.highConfidence,
      ...data.mediumConfidence,
      ...data.lowConfidence
    ].filter(app => app.confidence !== 'low' || Math.random() > 0.7); // Mock distance filter

    const nearbyCount = nearbyApplications.length;

    // Get all applications with details
    const applications = nearbyApplications.map(app => ({
      description: app.application.DevelopmentDescription?.substring(0, 80) || 'Development application',
      status: app.application.ApplicationStatus || 'Unknown',
      distance: Math.floor(Math.random() * 150) + 1, // Mock distance
      type: app.application.ApplicationType || 'Unknown',
      confidence: app.confidence,
      applicationNumber: app.application.ApplicationNumber || 'Unknown'
    }));

    // Get the top application (closest/most relevant) for backward compatibility
    const topApplication = applications.length > 0 ? applications[0] : undefined;

    return {
      totalApplications,
      nearbyCount,
      radius: 150,
      topApplication,
      applications // Include all applications for expandable view
    };
  } catch (error) {
    console.error('Failed to fetch planning data:', error);
    return {
      totalApplications: 0,
      nearbyCount: 0,
      radius: 150,
      topApplication: undefined
    };
  }
}

async function estimateRentalValue(property: ComparableProperty) {
// Mock rental estimation based on property data
// In production, this would query your rentals data
const baseRent = 1500;
const bedsMultiplier = (property.beds || 2) * 300;
const areaMultiplier = property.dublinPostcode?.startsWith('D4') ? 1.5 : 1.0;

return Math.round((baseRent + bedsMultiplier) * areaMultiplier);
}

function estimateRentalYield(property: any): number {
  // Mock rental estimation based on property data
  // In production, this would query your rentals data
  const baseRent = 1500;
  const bedsMultiplier = (property.beds || 2) * 300;
  const areaMultiplier = property.dublinPostcode?.startsWith('D4') ? 1.5 : 1.0;

  return Math.round((baseRent + bedsMultiplier) * areaMultiplier);
}

function getDaysOnMarket(property: any): string {
  if (property._type === 'sold') {
    // For sold properties, calculate from scraped_at or first_seen_date
    const date = property.scrapedAt || property.first_seen_date;
    if (date) {
      const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
      return days > 0 ? `${days} days` : 'Recent';
    }
  } else if (property._type === 'listing') {
    // For listings, use first_seen_date
    const date = property.first_seen_date;
    if (date) {
      const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
      return days > 0 ? `${days} days` : 'New';
    }
  } else if (property._type === 'rental') {
    return 'N/A';
  }
  return 'Unknown';
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal
}

function generateInsights(properties: EnrichedProperty[]) {
  const insights: any = {
    bestValue: null,
    bestWalkability: null,
    lowestMortgage: null,
    bestTransit: null,
    bestOverall: null,
    bestInvestment: null,
    bestFamily: null,
    bestCommuter: null,
    bestRentalYield: null,
    fastestSale: null,
    warnings: [],
    highlights: [],
    marketInsights: []
  };

  // Helper function to get property score combining multiple factors
  const getOverallScore = (prop: EnrichedProperty) => {
    let score = 0;

    // Price efficiency (lower is better, normalized to 0-10 scale)
    const pricePerSqm = prop.pricePerSqm || 0;
    if (pricePerSqm > 0) {
      const priceScore = Math.max(0, 10 - (pricePerSqm / 10000) * 5); // €10k/m² = score 5
      score += priceScore * 0.3;
    }

    // Walkability (higher is better)
    const walkScore = prop.enrichment.walkability?.score || 0;
    score += (walkScore / 10) * 0.25;

    // Market position (being at or below market is better)
    const marketPos = prop.enrichment.marketPosition;
    if (marketPos === 'below') score += 2;
    else if (marketPos === 'at') score += 1;

    // Mortgage affordability (lower monthly payment is better)
    const mortgageMonthly = prop.enrichment.mortgage?.monthly;
    if (mortgageMonthly) {
      const mortgageScore = Math.max(0, 10 - (mortgageMonthly / 3000) * 5); // €3000/mo = score 5
      score += mortgageScore * 0.2;
    }

    // Size efficiency (beds per €100k)
    const beds = prop.beds || 1;
    const price = prop.soldPrice || prop.askingPrice || 0;
    if (price > 0) {
      const sizeEfficiency = beds / (price / 100000);
      score += Math.min(sizeEfficiency * 2, 2); // Cap at 2 points
    }

    return score;
  };

  // 1. Best Overall Value (combines price, location, affordability)
  let bestOverallIndex = -1;
  let bestOverallScore = -1;

  properties.forEach((prop, index) => {
    const score = getOverallScore(prop);
    if (score > bestOverallScore) {
      bestOverallScore = score;
      bestOverallIndex = index;
    }
  });

  if (bestOverallIndex >= 0) {
    insights.bestOverall = {
      index: bestOverallIndex,
      reason: `Best overall value considering price, location, and affordability`
    };
  }

  // 2. Best Investment Potential (appreciation + rental yield)
  let bestInvestmentIndex = -1;
  let bestInvestmentScore = -1;

  properties.forEach((prop, index) => {
    let investmentScore = 0;

    // Location quality (walkability + transport access)
    const walkScore = prop.enrichment.walkability?.score || 0;
    const transitDistance = prop.enrichment.walkability?.nearestDartLuas?.distance || 1000;
    investmentScore += (walkScore / 10) * 0.4;
    investmentScore += Math.max(0, 1 - (transitDistance / 1000)) * 0.3; // Closer to transport = better

    // Market position (slightly below market often indicates good investment timing)
    if (prop.enrichment.marketPosition === 'below') investmentScore += 0.3;

    // Competition level (moderate competition = good investment)
    if (prop.enrichment.competitionLevel === 'medium') investmentScore += 0.2;

    if (investmentScore > bestInvestmentScore) {
      bestInvestmentScore = investmentScore;
      bestInvestmentIndex = index;
    }
  });

  if (bestInvestmentIndex >= 0) {
    insights.bestInvestment = {
      index: bestInvestmentIndex,
      reason: `Strongest investment potential based on location quality and market timing`
    };
  }

  // 3. Best Family-Friendly Property
  let bestFamilyIndex = -1;
  let bestFamilyScore = -1;

  properties.forEach((prop, index) => {
    let familyScore = 0;

    // Size (more bedrooms = better for families)
    const beds = prop.beds || 0;
    familyScore += Math.min(beds / 4, 1) * 0.3; // 4+ beds = max score

    // Education access (higher education amenity score)
    const educationScore = prop.enrichment.walkability?.breakdown?.education || 0;
    familyScore += (educationScore / 10) * 0.3;

    // Shopping access (for daily needs)
    const shoppingScore = prop.enrichment.walkability?.breakdown?.shopping || 0;
    familyScore += (shoppingScore / 10) * 0.2;

    // Healthcare access
    const healthcareScore = prop.enrichment.walkability?.breakdown?.healthcare || 0;
    familyScore += (healthcareScore / 10) * 0.2;

    if (familyScore > bestFamilyScore) {
      bestFamilyScore = familyScore;
      bestFamilyIndex = index;
    }
  });

  if (bestFamilyIndex >= 0) {
    insights.bestFamily = {
      index: bestFamilyIndex,
      reason: `Most family-friendly with good education and amenity access`
    };
  }

  // 4. Best Commuter Property
  let bestCommuterIndex = -1;
  let bestCommuterScore = -1;

  properties.forEach((prop, index) => {
    let commuterScore = 0;

    // Transport access (closer to DART/Luas = better)
    const transitDistance = prop.enrichment.walkability?.nearestDartLuas?.distance || 2000;
    commuterScore += Math.max(0, 1 - (transitDistance / 2000)) * 0.6; // Within 2km

    // Transport amenity score
    const transportScore = prop.enrichment.walkability?.breakdown?.transport || 0;
    commuterScore += (transportScore / 10) * 0.4;

    if (commuterScore > bestCommuterScore) {
      bestCommuterScore = commuterScore;
      bestCommuterIndex = index;
    }
  });

  if (bestCommuterIndex >= 0) {
    const transitName = properties[bestCommuterIndex].enrichment.walkability?.nearestDartLuas?.name;
    insights.bestCommuter = {
      index: bestCommuterIndex,
      reason: `Best for commuters - closest to ${transitName || 'public transport'}`
    };
  }

  // 5. Best Rental Yield Potential
  let bestRentalIndex = -1;
  let bestYield = 0;

  properties.forEach((prop, index) => {
    if (prop._type === 'sold' || prop._type === 'listing') {
      const estimatedRent = estimateRentalYield(prop);
      const price = prop.soldPrice || prop.askingPrice || 0;
      if (price > 0) {
        const rentalYield = (estimatedRent * 12) / price * 100; // Annual yield percentage
        if (rentalYield > bestYield) {
          bestYield = rentalYield;
          bestRentalIndex = index;
        }
      }
    }
  });

  if (bestRentalIndex >= 0) {
    insights.bestRentalYield = {
      index: bestRentalIndex,
      reason: `Highest estimated rental yield: ${bestYield.toFixed(1)}% annually`
    };
  }

  // 6. Fastest Potential Sale
  let fastestSaleIndex = -1;
  let bestSaleScore = -1;

  properties.forEach((prop, index) => {
    let saleScore = 0;

    // Lower price per sqm = faster sale potential
    const pricePerSqm = prop.pricePerSqm || 0;
    if (pricePerSqm > 0) {
      saleScore += Math.max(0, 1 - (pricePerSqm / 15000)) * 0.3; // €15k/m² threshold
    }

    // Below market value = faster sale
    if (prop.enrichment.marketPosition === 'below') saleScore += 0.3;

    // High competition area = faster sale
    if (prop.enrichment.competitionLevel === 'high') saleScore += 0.2;

    // Lower days on market = already moving faster
    const daysOnMarket = getDaysOnMarket(prop);
    if (daysOnMarket !== 'Unknown' && daysOnMarket !== 'N/A') {
      const days = parseInt(daysOnMarket.split(' ')[0]) || 30;
      saleScore += Math.max(0, 1 - (days / 90)) * 0.2; // Less than 90 days is good
    }

    if (saleScore > bestSaleScore) {
      bestSaleScore = saleScore;
      fastestSaleIndex = index;
    }
  });

  if (fastestSaleIndex >= 0) {
    insights.fastestSale = {
      index: fastestSaleIndex,
      reason: `Most likely to sell quickly based on price positioning and market conditions`
    };
  }

  // Legacy insights (keeping for backward compatibility)
  // Find best value (lowest price per sqm)
  let bestValueIndex = -1;
  let lowestPricePerSqm = Infinity;

  properties.forEach((prop, index) => {
    const pricePerSqm = prop.pricePerSqm || prop.rentPerSqm;
    if (pricePerSqm && pricePerSqm < lowestPricePerSqm) {
      lowestPricePerSqm = pricePerSqm;
      bestValueIndex = index;
    }
  });

  if (bestValueIndex >= 0) {
    insights.bestValue = {
      index: bestValueIndex,
      reason: `Lowest price per m² at €${lowestPricePerSqm.toLocaleString()}/m²`
    };
  }

  // Find best walkability
  let bestWalkabilityIndex = -1;
  let highestWalkScore = 0;

  properties.forEach((prop, index) => {
    const walkScore = prop.enrichment.walkability?.score || 0;
    if (walkScore > highestWalkScore) {
      highestWalkScore = walkScore;
      bestWalkabilityIndex = index;
    }
  });

  if (bestWalkabilityIndex >= 0) {
    insights.bestWalkability = {
      index: bestWalkabilityIndex,
      reason: `Highest walkability score: ${highestWalkScore}/10`
    };
  }

  // Find lowest mortgage cost
  let lowestMortgageIndex = -1;
  let lowestMortgageCost = Infinity;

  properties.forEach((prop, index) => {
    const cost = prop.enrichment.mortgage?.monthly || Infinity;
    if (cost < lowestMortgageCost) {
      lowestMortgageCost = cost;
      lowestMortgageIndex = index;
    }
  });

  if (lowestMortgageIndex >= 0) {
    insights.lowestMortgage = {
      index: lowestMortgageIndex,
      reason: `Lowest monthly mortgage at €${lowestMortgageCost.toLocaleString()}`
    };
  }

  // Find best transit access
  let bestTransitIndex = -1;
  let closestTransit = Infinity;

  properties.forEach((prop, index) => {
    const distance = prop.enrichment.walkability?.nearestDartLuas?.distance || Infinity;
    if (distance < closestTransit) {
      closestTransit = distance;
      bestTransitIndex = index;
    }
  });

  if (bestTransitIndex >= 0 && closestTransit < Infinity) {
    const transitName = properties[bestTransitIndex].enrichment.walkability?.nearestDartLuas?.name;
    insights.bestTransit = {
      index: bestTransitIndex,
      reason: `Closest to ${transitName} (${closestTransit}m)`
    };
  }

  // Enhanced warnings and highlights
  properties.forEach((prop, index) => {
    if (!prop.enrichment) return; // Skip if no enrichment data

    // Price warnings (using type-specific comparison)
    if (prop.enrichment.marketPositionPct > 15) {
      const typeGroup = prop.enrichment.propertyTypeGroup?.replace('_', ' ') || 'similar properties';
      insights.warnings.push({
        index,
        message: `${Math.abs(prop.enrichment.marketPositionPct).toFixed(1)}% above ${typeGroup} median - may be overpriced`
      });
    }

    // Planning application warnings
    if (prop.enrichment.planning && prop.enrichment.planning.nearbyCount > 2) {
      insights.warnings.push({
        index,
        message: `${prop.enrichment.planning.nearbyCount} planning applications nearby - potential disruption`
      });
    }

    // High competition warnings
    if (prop.enrichment.competitionLevel === 'high' && prop.enrichment.marketPositionPct > 5) {
      insights.warnings.push({
        index,
        message: 'High competition area + above market price - challenging sale conditions'
      });
    }
  });

  // Enhanced highlights
  properties.forEach((prop, index) => {
    if (!prop.enrichment) return; // Skip if no enrichment data
    // Excellent value highlights
    if (prop.enrichment.marketPosition === 'below' && prop.enrichment.walkability?.score && prop.enrichment.walkability.score >= 7) {
      insights.highlights.push({
        index,
        message: 'Below market value with good walkability - strong buying opportunity'
      });
    }

    // High walkability highlights
    if (prop.enrichment.walkability?.score && prop.enrichment.walkability.score >= 9) {
      insights.highlights.push({
        index,
        message: 'Exceptional walkability - access to virtually all amenities on foot'
      });
    }

    // Prime investment timing
    if (prop.enrichment.marketPosition === 'below' && prop.enrichment.competitionLevel === 'medium') {
      insights.highlights.push({
        index,
        message: 'Sweet spot: below market value in moderately competitive area'
      });
    }

    // Family home highlights
    const beds = prop.beds || 0;
    const educationScore = prop.enrichment.walkability?.breakdown?.education || 0;
    if (beds >= 3 && educationScore >= 7) {
      insights.highlights.push({
        index,
        message: 'Ideal family home - spacious with excellent school access'
      });
    }

    // Prime investment timing
    if (prop.enrichment.marketPosition === 'below' && prop.enrichment.competitionLevel === 'medium') {
      insights.highlights.push({
        index,
        message: 'Sweet spot: below market value in moderately competitive area'
      });
    }
  });

  // Market insights
  const avgPrice = properties.reduce((sum, p) => sum + (p.soldPrice || p.askingPrice || 0), 0) / properties.length;
  const avgWalkability = properties.reduce((sum, p) => {
    // Ensure every property has walkability data
    const score = p.enrichment?.walkability?.score;
    return sum + (typeof score === 'number' ? score : 5); // Default to 5 if missing
  }, 0) / properties.length;

  const validProperties = properties.filter(p => p.enrichment);
  const highCompetitionCount = validProperties.filter(p => p.enrichment?.competitionLevel === 'high').length;
  const belowMarketCount = validProperties.filter(p => p.enrichment?.marketPosition === 'below').length;

  insights.marketInsights.push(
    `Average property price: €${avgPrice.toLocaleString()}`,
    `Average walkability score: ${avgWalkability.toFixed(1)}/10`,
    `${highCompetitionCount} properties in high-competition areas`,
    `${belowMarketCount} properties priced below type-specific medians`,
    `Market positions calculated against similar property types (same bedroom count & style)`
  );

  return insights;
}
