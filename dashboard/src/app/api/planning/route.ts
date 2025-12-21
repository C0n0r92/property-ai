import { NextRequest, NextResponse } from 'next/server';
import { latLngToWebMercator, isValidIrishCoordinates } from '@/lib/coordinates';
import { scorePlanningApplication, groupApplicationsByConfidence, generatePlanningPortalUrl } from '@/lib/planning-matching';
import { PlanningApplication, PlanningResponse } from '@/types/property';

// Simple in-memory cache with TTL
interface CacheEntry {
  data: PlanningResponse;
  timestamp: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const planningCache = new Map<string, CacheEntry>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract and validate parameters
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const address = searchParams.get('address');
    const dublinPostcode = searchParams.get('dublinPostcode');
    const expandedSearch = searchParams.get('expandedSearch') === 'true';

    if (!lat || !lng || !address) {
      return NextResponse.json(
        { error: 'Missing required parameters: lat, lng, address' },
        { status: 400 }
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (!isValidIrishCoordinates(latitude, longitude)) {
      return NextResponse.json(
        { error: 'Coordinates are not valid for Ireland' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
    const cached = planningCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      return NextResponse.json({
        ...cached.data,
        cached: true
      });
    }

    // Fetch fresh data
    const result = await fetchPlanningApplications(latitude, longitude, address, dublinPostcode, expandedSearch);

    // Cache the result
    planningCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return NextResponse.json({
      ...result,
      cached: false
    });

  } catch (error) {
    console.error('Planning API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Fetch planning applications with progressive radius search
 */
async function fetchPlanningApplications(
  lat: number,
  lng: number,
  address: string,
  dublinPostcode?: string | null,
  expandedSearch = false
): Promise<PlanningResponse> {
    // Convert to Web Mercator
    const [x, y] = latLngToWebMercator(lat, lng);

  // Progressive radius search
  const radii: (30 | 75 | 150)[] = expandedSearch ? [30, 75, 150] : [30, 75];

  for (const radius of radii) {
    try {
      const applications = await queryArcGIS(x, y, radius);

      if (applications.length > 0) {
        // Score each application
        const scoredApplications = applications.map(app =>
          scorePlanningApplication(app, {
            propertyAddress: address,
            dublinPostcode: dublinPostcode || undefined,
            searchRadius: radius
          })
        );

        // Group by confidence
        const { highConfidence, mediumConfidence, lowConfidence } = groupApplicationsByConfidence(scoredApplications);

        return {
          highConfidence,
          mediumConfidence,
          lowConfidence,
          totalCount: scoredApplications.length,
          searchRadius: radius,
          cached: false
        };
      }
    } catch (error) {
      console.warn(`ArcGIS query failed for radius ${radius}:`, error);
      // Continue to next radius
    }
  }

  // No results found at any radius
  return {
    highConfidence: [],
    mediumConfidence: [],
    lowConfidence: [],
    totalCount: 0,
    searchRadius: null,
    cached: false
  };
}

/**
 * Query ArcGIS FeatureServer API
 */
async function queryArcGIS(x: number, y: number, radius: 30 | 75 | 150): Promise<PlanningApplication[]> {
  const baseUrl = 'https://services.arcgis.com/NzlPQPKn5QF9v2US/arcgis/rest/services/IrishPlanningApplications/FeatureServer/0/query';

  const params = new URLSearchParams({
    geometry: `${Math.round(x)},${Math.round(y)}`,
    geometryType: 'esriGeometryPoint',
    spatialRel: 'esriSpatialRelIntersects',
    distance: radius.toString(),
    units: 'esriSRUnit_Meter',
    outFields: '*',
    returnGeometry: 'false',
    f: 'pjson'
  });

  const url = `${baseUrl}?${params}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'GaffIntel/1.0',
      'Accept': 'application/json'
    },
    // Add timeout
    signal: AbortSignal.timeout(10000) // 10 second timeout
  });

  if (!response.ok) {
    throw new Error(`ArcGIS API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.features || !Array.isArray(data.features)) {
    throw new Error('Invalid ArcGIS response format');
  }

  // Transform ArcGIS features to our PlanningApplication format
  return data.features.map((feature: any) => {
    const authority = feature.attributes.PlanningAuthority;
    const appNumber = feature.attributes.ApplicationNumber;
    const portalUrl = generatePlanningPortalUrl(authority, appNumber);

    return {
      OBJECTID: feature.attributes.OBJECTID,
      PlanningAuthority: authority,
      ApplicationNumber: appNumber,
      DevelopmentDescription: feature.attributes.DevelopmentDescription,
      DevelopmentAddress: feature.attributes.DevelopmentAddress,
      DevelopmentPostcode: feature.attributes.DevelopmentPostcode,
      ITMEasting: feature.attributes.ITMEasting,
      ITMNorthing: feature.attributes.ITMNorthing,
      ApplicationStatus: feature.attributes.ApplicationStatus,
      ApplicationType: feature.attributes.ApplicationType,
      Decision: feature.attributes.Decision,
      AreaofSite: feature.attributes.AreaofSite,
      FloorArea: feature.attributes.FloorArea,
      NumResidentialUnits: feature.attributes.NumResidentialUnits,
      ReceivedDate: feature.attributes.ReceivedDate,
      DecisionDate: feature.attributes.DecisionDate,
      DecisionDueDate: feature.attributes.DecisionDueDate,
      GrantDate: feature.attributes.GrantDate,
      ExpiryDate: feature.attributes.ExpiryDate,
      AppealRefNumber: feature.attributes.AppealRefNumber,
      AppealStatus: feature.attributes.AppealStatus,
      LinkAppDetails: portalUrl, // Use our generated URL instead of null
      ETL_DATE: feature.attributes.ETL_DATE
    };
  });
}


