/**
 * Planning Permission Premium Analysis v3 - AGGRESSIVE MATCHING
 *
 * Much looser matching to find more properties with planning history:
 * - 100m radius (vs 50m)
 * - Just street name match (not requiring house number)
 * - Any grant date before sale (not limited to 5 years)
 *
 * Run: node scripts/analyze-planning-premium-v3.js
 */

const fs = require('fs');
const path = require('path');

function latLngToWebMercator(lat, lng) {
  const x = lng * 20037508.34 / 180;
  const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
  const yMercator = y * 20037508.34 / 180;
  return [x, yMercator];
}

const WORK_TYPE_PATTERNS = {
  extension: [/\bextension\b/i, /\bextend\b/i, /\bstorey\b/i, /\brear\b.*\b(addition|build)\b/i],
  attic_conversion: [/\battic\b/i, /\bloft\b/i, /\bdormer\b/i, /\broof\s*space\b/i],
  garage_conversion: [/\bgarage\b/i],
  renovation: [/\brenovation\b/i, /\brefurbish/i, /\bmodernisation\b/i],
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

function extractStreetName(address) {
  // Get just the street name, normalized
  const normalized = (address || '')
    .toLowerCase()
    .replace(/[,\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove house number
  const withoutNumber = normalized.replace(/^\d+[a-z]?\s+/, '');

  // Get first meaningful part (before Dublin/postcode)
  const parts = withoutNumber.split(/\s+(dublin|d\d+|co\.?\s*dublin)/i);
  const streetPart = parts[0] || withoutNumber;

  // Extract key street words
  const streetWords = streetPart.split(' ')
    .filter(w => w.length > 2)
    .filter(w => !['the', 'and', 'off'].includes(w))
    .slice(0, 3); // First 3 significant words

  return streetWords.join(' ');
}

function addressMatchLoose(planningAddr, propertyAddr) {
  const planningStreet = extractStreetName(planningAddr);
  const propertyStreet = extractStreetName(propertyAddr);

  if (!planningStreet || !propertyStreet) return false;

  // Check if streets share at least 2 words
  const planningWords = planningStreet.split(' ');
  const propertyWords = propertyStreet.split(' ');
  const common = planningWords.filter(w => propertyWords.some(pw => pw.includes(w) || w.includes(pw)));

  return common.length >= 2;
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

async function queryPlanningAPI(lat, lng, radius = 100) {
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
    headers: { 'User-Agent': 'GaffIntel/1.0', 'Accept': 'application/json' },
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const data = await response.json();
  return (data.features || []).map(f => f.attributes);
}

function loadPropertyData() {
  const dataPath = path.join(__dirname, '../dashboard/public/data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  return data.properties || data;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('='.repeat(60));
  console.log('PLANNING PERMISSION ANALYSIS v3 - AGGRESSIVE MATCHING');
  console.log('='.repeat(60));

  const properties = loadPropertyData();

  // Filter valid properties
  const validProperties = properties.filter(p =>
    p.latitude && p.longitude &&
    p.areaSqm && p.areaSqm > 0 &&
    p.soldPrice && p.soldPrice > 0 &&
    p.dublinPostcode &&
    p.propertyType &&
    p.scrapedAt
  );

  console.log(`\nValid properties: ${validProperties.length}`);

  // Sample more aggressively - 500 per postcode
  const byPostcode = new Map();
  for (const p of validProperties) {
    const list = byPostcode.get(p.dublinPostcode) || [];
    list.push(p);
    byPostcode.set(p.dublinPostcode, list);
  }

  const sampled = [];
  for (const [, props] of byPostcode) {
    const shuffled = props.sort(() => Math.random() - 0.5);
    sampled.push(...shuffled.slice(0, 200));
  }

  console.log(`Sampled ${sampled.length} properties across ${byPostcode.size} postcodes`);

  // Track results
  const withPlanningNearby = [];  // Any planning activity at address
  const withGrantedBefore = [];   // Specifically granted before sale
  const withoutPlanning = [];

  let processed = 0;
  let apiErrors = 0;

  for (const property of sampled) {
    try {
      const applications = await queryPlanningAPI(property.latitude, property.longitude, 100);
      const saleDate = new Date(property.scrapedAt);

      // Find any applications at this address
      const atThisAddress = applications.filter(app => {
        if ((app.NumResidentialUnits || 0) > 3) return false;
        return addressMatchLoose(app.DevelopmentAddress, property.address);
      });

      if (atThisAddress.length > 0) {
        // Check if any were granted before sale
        const grantedBefore = atThisAddress.filter(app => {
          const decision = (app.Decision || '').toLowerCase();
          if (!decision.includes('grant')) return false;
          if (!app.GrantDate) return false;
          return new Date(app.GrantDate) < saleDate;
        });

        withPlanningNearby.push({
          ...property,
          applications: atThisAddress.length,
          grantedBeforeSale: grantedBefore.length,
        });

        if (grantedBefore.length > 0) {
          const workType = detectWorkType(grantedBefore[0].DevelopmentDescription);
          withGrantedBefore.push({
            ...property,
            workType,
            planningApp: grantedBefore[0],
          });
        }
      } else {
        withoutPlanning.push(property);
      }

    } catch (err) {
      apiErrors++;
    }

    processed++;
    if (processed % 100 === 0) {
      console.log(`Processed ${processed}/${sampled.length} | Nearby: ${withPlanningNearby.length} | Granted before: ${withGrantedBefore.length} | Errors: ${apiErrors}`);
      await sleep(50);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('RESULTS');
  console.log('='.repeat(60));

  console.log(`\nTotal processed: ${processed}`);
  console.log(`Properties with ANY planning at address: ${withPlanningNearby.length} (${(withPlanningNearby.length / processed * 100).toFixed(1)}%)`);
  console.log(`Properties with GRANTED permission before sale: ${withGrantedBefore.length} (${(withGrantedBefore.length / processed * 100).toFixed(1)}%)`);
  console.log(`Properties with no planning: ${withoutPlanning.length}`);
  console.log(`API errors: ${apiErrors}`);

  // Analyze price differences
  if (withGrantedBefore.length >= 10 && withoutPlanning.length >= 50) {
    console.log('\n--- PRICE COMPARISON ---');

    const withPrices = withGrantedBefore.filter(p => p.areaSqm > 0).map(p => p.soldPrice / p.areaSqm);
    const withoutPrices = withoutPlanning.filter(p => p.areaSqm > 0).map(p => p.soldPrice / p.areaSqm);

    const withMedian = median(withPrices);
    const withoutMedian = median(withoutPrices);
    const premium = ((withMedian - withoutMedian) / withoutMedian) * 100;

    console.log(`With granted permission: €${Math.round(withMedian)}/sqm (n=${withPrices.length})`);
    console.log(`Without planning: €${Math.round(withoutMedian)}/sqm (n=${withoutPrices.length})`);
    console.log(`Premium: ${premium > 0 ? '+' : ''}${premium.toFixed(1)}%`);

    // By work type
    console.log('\n--- BY WORK TYPE ---');
    const byWorkType = new Map();
    for (const p of withGrantedBefore) {
      const list = byWorkType.get(p.workType) || [];
      list.push(p);
      byWorkType.set(p.workType, list);
    }

    for (const [workType, props] of byWorkType) {
      if (props.length < 5) continue;
      const prices = props.filter(p => p.areaSqm > 0).map(p => p.soldPrice / p.areaSqm);
      const med = median(prices);
      const prem = ((med - withoutMedian) / withoutMedian) * 100;
      console.log(`${workType}: €${Math.round(med)}/sqm (n=${prices.length}) | ${prem > 0 ? '+' : ''}${prem.toFixed(1)}% vs no planning`);
    }
  }

  // Sample of matches
  console.log('\n--- SAMPLE MATCHES ---');
  for (const p of withGrantedBefore.slice(0, 10)) {
    console.log(`\nProperty: ${p.address}`);
    console.log(`Planning: ${p.planningApp.DevelopmentAddress}`);
    console.log(`Work: ${p.workType} | Sold: €${p.soldPrice.toLocaleString()} | €${Math.round(p.soldPrice / p.areaSqm)}/sqm`);
  }

  // Save
  const outputPath = path.join(__dirname, 'planning-premium-analysis-v3.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    processed,
    withPlanningNearby: withPlanningNearby.length,
    withGrantedBefore: withGrantedBefore.length,
    withoutPlanning: withoutPlanning.length,
    matchRate: (withPlanningNearby.length / processed * 100).toFixed(1) + '%',
    grantedRate: (withGrantedBefore.length / processed * 100).toFixed(1) + '%',
    sampleProperties: withGrantedBefore.slice(0, 50).map(p => ({
      address: p.address,
      postcode: p.dublinPostcode,
      soldPrice: p.soldPrice,
      areaSqm: p.areaSqm,
      pricePerSqm: Math.round(p.soldPrice / p.areaSqm),
      workType: p.workType,
      planningAddress: p.planningApp?.DevelopmentAddress,
      planningDescription: p.planningApp?.DevelopmentDescription?.substring(0, 100),
    })),
  }, null, 2));

  console.log(`\nResults saved to: ${outputPath}`);
}

main().catch(console.error);
