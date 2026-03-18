/**
 * Planning Permission Premium Analysis v2
 *
 * Smarter approach: Sample sold properties and query planning API for each
 * to find which ones had permission before sale.
 *
 * Run: node scripts/analyze-planning-premium-v2.js
 */

const fs = require('fs');
const path = require('path');

// Web Mercator conversion (same as in coordinates.ts)
function latLngToWebMercator(lat, lng) {
  const x = lng * 20037508.34 / 180;
  const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
  const yMercator = y * 20037508.34 / 180;
  return [x, yMercator];
}

// Work type detection patterns
const WORK_TYPE_PATTERNS = {
  extension: [
    /\bextension\b/i,
    /\bextend\b/i,
    /\bsingle.?storey\b/i,
    /\btwo.?storey\b/i,
    /\brear extension\b/i,
    /\bside extension\b/i,
  ],
  attic_conversion: [
    /\battic\b/i,
    /\bloft\b/i,
    /\bdormer\b/i,
    /\broof.?space\b/i,
    /\bmansard\b/i,
  ],
  garage_conversion: [
    /\bgarage.*(conversion|habitable)\b/i,
    /\bconvert.*garage\b/i,
  ],
  renovation: [
    /\brenovation\b/i,
    /\brefurbish/i,
    /\bmodernisation\b/i,
    /\binternal.?alter/i,
  ],
};

function detectWorkType(description) {
  const desc = (description || '').toLowerCase();
  for (const [type, patterns] of Object.entries(WORK_TYPE_PATTERNS)) {
    if (patterns.some(p => p.test(desc))) {
      return type;
    }
  }
  return 'other';
}

function normalizeAddress(address) {
  return (address || '')
    .toLowerCase()
    .replace(/[,\.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractStreetNumber(address) {
  const match = (address || '').match(/^(\d+[a-z]?)/i);
  return match ? match[1].toLowerCase() : null;
}

function addressMatch(planningAddr, propertyAddr) {
  const normPlanning = normalizeAddress(planningAddr);
  const normProperty = normalizeAddress(propertyAddr);

  // Extract house numbers
  const planningNum = extractStreetNumber(planningAddr);
  const propertyNum = extractStreetNumber(propertyAddr);

  // Must have matching house number
  if (!planningNum || !propertyNum || planningNum !== propertyNum) {
    return false;
  }

  // Check street name overlap
  const planningWords = normPlanning.split(' ').filter(w => w.length > 3);
  const propertyWords = normProperty.split(' ').filter(w => w.length > 3);
  const commonWords = planningWords.filter(w => propertyWords.includes(w));

  return commonWords.length >= 2;
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

async function queryPlanningAPI(lat, lng, radius = 50) {
  const [x, y] = latLngToWebMercator(lat, lng);

  const baseUrl = 'https://services.arcgis.com/NzlPQPKn5QF9v2US/arcgis/rest/services/IrishPlanningApplications/FeatureServer/0/query';

  const params = new URLSearchParams({
    geometry: `${Math.round(x)},${Math.round(y)}`,
    geometryType: 'esriGeometryPoint',
    spatialRel: 'esriSpatialRelIntersects',
    distance: radius.toString(),
    units: 'esriSRUnit_Meter',
    outFields: 'ApplicationNumber,DevelopmentAddress,DevelopmentDescription,Decision,GrantDate,ReceivedDate,NumResidentialUnits',
    returnGeometry: 'false',
    f: 'pjson',
  });

  const response = await fetch(`${baseUrl}?${params}`, {
    headers: {
      'User-Agent': 'GaffIntel/1.0',
      'Accept': 'application/json'
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.features || []).map(f => f.attributes);
}

function loadPropertyData() {
  console.log('Loading property data...');

  const possiblePaths = [
    path.join(__dirname, '../dashboard/public/data.json'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      const properties = data.properties || data;
      console.log(`Loaded ${properties.length} properties`);
      return properties;
    }
  }

  throw new Error('Could not find property data file');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('='.repeat(60));
  console.log('PLANNING PERMISSION PREMIUM ANALYSIS v2');
  console.log('='.repeat(60));
  console.log('\nThis analysis queries planning data for sampled properties\n');

  const properties = loadPropertyData();

  // Filter to properties with coordinates, sqm, and valid types
  const validProperties = properties.filter(p =>
    p.latitude && p.longitude &&
    p.areaSqm && p.areaSqm > 0 &&
    p.soldPrice && p.soldPrice > 0 &&
    p.dublinPostcode &&
    p.propertyType &&
    p.scrapedAt
  );

  console.log(`Valid properties with coordinates: ${validProperties.length}`);

  // Sample properties (stratified by postcode to get good coverage)
  const byPostcode = new Map();
  for (const p of validProperties) {
    const list = byPostcode.get(p.dublinPostcode) || [];
    list.push(p);
    byPostcode.set(p.dublinPostcode, list);
  }

  // Sample up to 100 properties per postcode
  const sampled = [];
  for (const [postcode, props] of byPostcode) {
    const shuffled = props.sort(() => Math.random() - 0.5);
    sampled.push(...shuffled.slice(0, 100));
  }

  console.log(`Sampled ${sampled.length} properties across ${byPostcode.size} postcodes`);

  // Query planning API for each property
  const propertiesWithPermission = [];
  const propertiesWithoutPermission = [];

  let processed = 0;
  let apiErrors = 0;

  for (const property of sampled) {
    try {
      const applications = await queryPlanningAPI(property.latitude, property.longitude, 50);
      const saleDate = new Date(property.scrapedAt);

      // Find matching applications granted BEFORE sale
      const matchingGrants = applications.filter(app => {
        // Must be granted
        const decision = (app.Decision || '').toLowerCase();
        if (!decision.includes('grant') && !decision.includes('approved')) return false;

        // Must be residential (not large development)
        if ((app.NumResidentialUnits || 0) > 2) return false;

        // Grant date must be before sale
        if (!app.GrantDate) return false;
        const grantDate = new Date(app.GrantDate);
        if (grantDate >= saleDate) return false;

        // Grant should be within 5 years of sale
        const yearsBeforeSale = (saleDate - grantDate) / (1000 * 60 * 60 * 24 * 365);
        if (yearsBeforeSale > 5) return false;

        // Address should match
        if (!addressMatch(app.DevelopmentAddress, property.address)) return false;

        return true;
      });

      if (matchingGrants.length > 0) {
        const workType = detectWorkType(matchingGrants[0].DevelopmentDescription);
        propertiesWithPermission.push({
          ...property,
          workType,
          planningApp: matchingGrants[0],
        });
      } else {
        propertiesWithoutPermission.push(property);
      }

    } catch (err) {
      apiErrors++;
    }

    processed++;
    if (processed % 100 === 0) {
      console.log(`Processed ${processed}/${sampled.length} (${propertiesWithPermission.length} with permission, ${apiErrors} errors)`);
      await sleep(100); // Rate limiting
    }

    // Stop early if we have enough data
    if (propertiesWithPermission.length >= 200 && processed >= 2000) {
      console.log('Stopping early - sufficient sample collected');
      break;
    }
  }

  console.log(`\nFinal counts:`);
  console.log(`With permission: ${propertiesWithPermission.length}`);
  console.log(`Without permission: ${propertiesWithoutPermission.length}`);
  console.log(`API errors: ${apiErrors}`);

  // Analyze results
  console.log('\n\n========== ANALYSIS BY WORK TYPE ==========\n');

  const byWorkType = new Map();
  for (const p of propertiesWithPermission) {
    const list = byWorkType.get(p.workType) || [];
    list.push(p);
    byWorkType.set(p.workType, list);
  }

  const results = [];

  for (const [workType, withPermProps] of byWorkType) {
    if (withPermProps.length < 5) continue;

    console.log(`\n--- ${workType.toUpperCase()} (${withPermProps.length} properties) ---`);

    // Calculate price/sqm for properties with permission
    const withPrices = withPermProps
      .filter(p => p.areaSqm > 0)
      .map(p => p.soldPrice / p.areaSqm);

    // Find comparable properties without permission
    const withoutPrices = [];
    for (const prop of withPermProps) {
      const comparables = propertiesWithoutPermission.filter(p =>
        p.dublinPostcode === prop.dublinPostcode &&
        p.propertyType === prop.propertyType &&
        p.beds && prop.beds && Math.abs(p.beds - prop.beds) <= 1 &&
        p.areaSqm > 0
      );
      for (const comp of comparables) {
        withoutPrices.push(comp.soldPrice / comp.areaSqm);
      }
    }

    if (withoutPrices.length < 10) {
      console.log('Insufficient comparables');
      continue;
    }

    const withMedian = median(withPrices);
    const withoutMedian = median(withoutPrices);
    const premium = ((withMedian - withoutMedian) / withoutMedian) * 100;

    console.log(`With permission: €${Math.round(withMedian)}/sqm (n=${withPrices.length})`);
    console.log(`Without permission: €${Math.round(withoutMedian)}/sqm (n=${withoutPrices.length})`);
    console.log(`Premium: ${premium > 0 ? '+' : ''}${premium.toFixed(1)}%`);

    results.push({
      workType,
      withPermission: {
        count: withPrices.length,
        medianPricePerSqm: Math.round(withMedian),
        avgPricePerSqm: Math.round(average(withPrices)),
      },
      withoutPermission: {
        count: withoutPrices.length,
        medianPricePerSqm: Math.round(withoutMedian),
        avgPricePerSqm: Math.round(average(withoutPrices)),
      },
      premiumPercent: Math.round(premium * 10) / 10,
    });
  }

  // Overall analysis
  console.log('\n\n========== OVERALL ANALYSIS ==========\n');

  const allWithPrices = propertiesWithPermission
    .filter(p => p.areaSqm > 0)
    .map(p => p.soldPrice / p.areaSqm);

  const allWithoutPrices = propertiesWithoutPermission
    .filter(p => p.areaSqm > 0)
    .map(p => p.soldPrice / p.areaSqm);

  if (allWithPrices.length > 0 && allWithoutPrices.length > 0) {
    const overallWithMedian = median(allWithPrices);
    const overallWithoutMedian = median(allWithoutPrices);
    const overallPremium = ((overallWithMedian - overallWithoutMedian) / overallWithoutMedian) * 100;

    console.log(`ALL properties with permission: €${Math.round(overallWithMedian)}/sqm (n=${allWithPrices.length})`);
    console.log(`ALL properties without permission: €${Math.round(overallWithoutMedian)}/sqm (n=${allWithoutPrices.length})`);
    console.log(`Overall premium: ${overallPremium > 0 ? '+' : ''}${overallPremium.toFixed(1)}%`);
  }

  // Analysis by postcode
  console.log('\n\n========== TOP POSTCODES WITH PERMISSION PREMIUM ==========\n');

  const postcodeAnalysis = [];
  const postcodes = [...new Set(propertiesWithPermission.map(p => p.dublinPostcode))];

  for (const postcode of postcodes) {
    const withPerm = propertiesWithPermission.filter(p => p.dublinPostcode === postcode);
    const withoutPerm = propertiesWithoutPermission.filter(p => p.dublinPostcode === postcode);

    if (withPerm.length < 3 || withoutPerm.length < 5) continue;

    const withPrices = withPerm.filter(p => p.areaSqm > 0).map(p => p.soldPrice / p.areaSqm);
    const withoutPrices = withoutPerm.filter(p => p.areaSqm > 0).map(p => p.soldPrice / p.areaSqm);

    if (withPrices.length < 3 || withoutPrices.length < 5) continue;

    const withMedian = median(withPrices);
    const withoutMedian = median(withoutPrices);
    const premium = ((withMedian - withoutMedian) / withoutMedian) * 100;

    postcodeAnalysis.push({
      postcode,
      withCount: withPrices.length,
      withoutCount: withoutPrices.length,
      withMedian: Math.round(withMedian),
      withoutMedian: Math.round(withoutMedian),
      premium: Math.round(premium * 10) / 10,
    });
  }

  postcodeAnalysis.sort((a, b) => b.premium - a.premium);

  console.log('Postcode | With Perm | Without | Premium');
  console.log('-'.repeat(50));
  for (const p of postcodeAnalysis.slice(0, 15)) {
    console.log(`${p.postcode.padEnd(8)} | €${p.withMedian}/sqm (${p.withCount}) | €${p.withoutMedian}/sqm (${p.withoutCount}) | ${p.premium > 0 ? '+' : ''}${p.premium}%`);
  }

  // Save results
  const outputPath = path.join(__dirname, 'planning-premium-analysis-v2.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalSampled: processed,
    propertiesWithPermission: propertiesWithPermission.length,
    propertiesWithoutPermission: propertiesWithoutPermission.length,
    resultsByWorkType: results,
    postcodeAnalysis,
    samplePropertiesWithPermission: propertiesWithPermission.slice(0, 30).map(p => ({
      address: p.address,
      postcode: p.dublinPostcode,
      type: p.propertyType,
      beds: p.beds,
      soldPrice: p.soldPrice,
      areaSqm: p.areaSqm,
      pricePerSqm: Math.round(p.soldPrice / p.areaSqm),
      workType: p.workType,
      planningAddress: p.planningApp?.DevelopmentAddress,
      planningDescription: p.planningApp?.DevelopmentDescription,
    })),
  }, null, 2));

  console.log(`\nDetailed results saved to: ${outputPath}`);
}

main().catch(console.error);
