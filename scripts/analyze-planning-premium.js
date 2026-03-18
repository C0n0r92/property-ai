/**
 * Planning Permission Premium Analysis
 *
 * This script analyzes whether properties with planning permission
 * sell for more than comparable properties without permission.
 *
 * Run: node scripts/analyze-planning-premium.js
 */

const fs = require('fs');
const path = require('path');

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
    .replace(/\b(co|county)\s*dublin\b/gi, '')
    .replace(/\bdublin\s*\d+\b/gi, '')
    .replace(/\b[a-z]\d{2}\s*[a-z0-9]{4}\b/gi, '') // Eircode
    .trim();
}

function extractStreetNumber(address) {
  const match = (address || '').match(/^(\d+[a-z]?)/i);
  return match ? match[1].toLowerCase() : null;
}

function extractStreetName(address) {
  const withoutNumber = (address || '').replace(/^\d+[a-z]?\s*/i, '');
  const parts = withoutNumber.split(/[,]/);
  return parts[0]?.trim().toLowerCase() || null;
}

function calculateAddressMatchScore(planningAddr, propertyAddr) {
  const normPlanning = normalizeAddress(planningAddr);
  const normProperty = normalizeAddress(propertyAddr);

  if (normPlanning === normProperty) return 100;

  const planningNum = extractStreetNumber(planningAddr);
  const propertyNum = extractStreetNumber(propertyAddr);
  const planningStreet = extractStreetName(planningAddr);
  const propertyStreet = extractStreetName(propertyAddr);

  let score = 0;

  if (planningNum && propertyNum && planningNum === propertyNum) {
    score += 40;
  }

  if (planningStreet && propertyStreet) {
    if (planningStreet === propertyStreet) {
      score += 50;
    } else if (propertyStreet.includes(planningStreet) || planningStreet.includes(propertyStreet)) {
      score += 30;
    }
  }

  const planningWords = normPlanning.split(' ').filter(w => w.length > 3);
  const propertyWords = normProperty.split(' ').filter(w => w.length > 3);
  const commonWords = planningWords.filter(w => propertyWords.includes(w));
  score += (commonWords.length / Math.max(planningWords.length, 1)) * 10;

  return Math.min(score, 100);
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

async function fetchPlanningData() {
  console.log('Fetching planning data from ArcGIS...');

  const baseUrl = 'https://services1.arcgis.com/eNO7HHeQ3rUcBllm/arcgis/rest/services/PlanningApplicationsPublic/FeatureServer/0/query';

  const fiveYearsAgo = Date.now() - (5 * 365 * 24 * 60 * 60 * 1000);

  const allApplications = [];
  let offset = 0;
  const batchSize = 2000;

  while (true) {
    const params = new URLSearchParams({
      where: `Decision LIKE '%Grant%' AND GrantDate > ${fiveYearsAgo}`,
      outFields: 'ApplicationNumber,DevelopmentAddress,DevelopmentDescription,Decision,GrantDate,ReceivedDate,ApplicationStatus,PlanningAuthority,NumResidentialUnits',
      returnGeometry: 'false',
      f: 'json',
      resultOffset: offset.toString(),
      resultRecordCount: batchSize.toString(),
    });

    const response = await fetch(`${baseUrl}?${params}`);
    const data = await response.json();

    if (!data.features || data.features.length === 0) break;

    const applications = data.features.map(f => f.attributes);
    allApplications.push(...applications);

    console.log(`  Fetched ${allApplications.length} planning applications...`);

    if (data.features.length < batchSize) break;
    offset += batchSize;

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`Total planning applications: ${allApplications.length}`);
  return allApplications;
}

function loadPropertyData() {
  console.log('Loading property data...');

  const possiblePaths = [
    path.join(__dirname, '../dashboard/public/data.json'),
    path.join(__dirname, '../apps/agent-app/public/data.json'),
    '/Users/conor.mcloughlin/code/property-ml/dashboard/public/data.json',
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      const properties = data.properties || data;
      console.log(`Loaded ${properties.length} properties from ${p}`);
      return properties;
    }
  }

  throw new Error('Could not find property data file');
}

function matchPlanningToProperties(planning, properties) {
  console.log('\nMatching planning applications to sold properties...');

  const matches = [];
  const MIN_MATCH_SCORE = 70;

  const residentialPlanning = planning.filter(p => {
    const units = p.NumResidentialUnits || 0;
    return units <= 2;
  });

  console.log(`Filtering to ${residentialPlanning.length} residential applications`);

  let processed = 0;
  for (const app of residentialPlanning) {
    if (!app.GrantDate || !app.DevelopmentAddress) continue;

    const grantDate = new Date(app.GrantDate);
    const workType = detectWorkType(app.DevelopmentDescription || '');

    if (workType === 'other') continue;

    for (const prop of properties) {
      if (!prop.scrapedAt || !prop.areaSqm || prop.areaSqm <= 0) continue;

      const saleDate = new Date(prop.scrapedAt);

      if (saleDate <= grantDate) continue;

      const monthsAfterGrant = (saleDate.getTime() - grantDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsAfterGrant < 6 || monthsAfterGrant > 36) continue;

      const matchScore = calculateAddressMatchScore(app.DevelopmentAddress, prop.address);

      if (matchScore >= MIN_MATCH_SCORE) {
        matches.push({
          property: prop,
          planning: app,
          matchScore,
          workType,
          monthsBetweenGrantAndSale: Math.round(monthsAfterGrant),
        });
      }
    }

    processed++;
    if (processed % 500 === 0) {
      console.log(`  Processed ${processed}/${residentialPlanning.length} applications, found ${matches.length} matches`);
    }
  }

  console.log(`\nTotal matches found: ${matches.length}`);
  return matches;
}

function findComparables(property, allProperties, excludeAddresses) {
  if (!property.dublinPostcode || !property.propertyType || !property.beds) {
    return [];
  }

  const saleDate = new Date(property.scrapedAt || '');
  const sixMonths = 6 * 30 * 24 * 60 * 60 * 1000;

  return allProperties.filter(p => {
    if (excludeAddresses.has(p.address)) return false;
    if (!p.areaSqm || p.areaSqm <= 0) return false;
    if (!p.scrapedAt) return false;
    if (p.dublinPostcode !== property.dublinPostcode) return false;
    if (p.propertyType !== property.propertyType) return false;
    if (!p.beds || Math.abs((p.beds || 0) - (property.beds || 0)) > 1) return false;

    const pSaleDate = new Date(p.scrapedAt);
    if (Math.abs(pSaleDate.getTime() - saleDate.getTime()) > sixMonths) return false;

    return true;
  });
}

function analyzeByWorkType(matches, allProperties) {
  console.log('\nAnalyzing price premium by work type...');

  const results = [];
  const matchedAddresses = new Set(matches.map(m => m.property.address));

  const byWorkType = new Map();
  for (const match of matches) {
    const existing = byWorkType.get(match.workType) || [];
    existing.push(match);
    byWorkType.set(match.workType, existing);
  }

  for (const [workType, typeMatches] of byWorkType) {
    console.log(`\n--- ${workType.toUpperCase()} ---`);
    console.log(`Properties with permission: ${typeMatches.length}`);

    const withPermissionPrices = [];
    const withPermissionDetails = [];

    for (const match of typeMatches) {
      const prop = match.property;
      if (prop.areaSqm && prop.areaSqm > 0) {
        const pricePerSqm = prop.soldPrice / prop.areaSqm;
        withPermissionPrices.push(pricePerSqm);
        withPermissionDetails.push({
          address: prop.address,
          pricePerSqm: Math.round(pricePerSqm),
          postcode: prop.dublinPostcode || 'Unknown',
          beds: prop.beds || 0,
          type: prop.propertyType || 'Unknown',
        });
      }
    }

    const withoutPermissionPrices = [];

    for (const match of typeMatches) {
      const comparables = findComparables(match.property, allProperties, matchedAddresses);
      for (const comp of comparables) {
        if (comp.areaSqm && comp.areaSqm > 0) {
          withoutPermissionPrices.push(comp.soldPrice / comp.areaSqm);
        }
      }
    }

    if (withPermissionPrices.length < 5 || withoutPermissionPrices.length < 10) {
      console.log(`Insufficient data for ${workType} (need 5+ with, 10+ without)`);
      continue;
    }

    const withMedian = median(withPermissionPrices);
    const withoutMedian = median(withoutPermissionPrices);
    const premiumPercent = ((withMedian - withoutMedian) / withoutMedian) * 100;

    const sampleSize = withPermissionPrices.length + withoutPermissionPrices.length;
    const confidence = sampleSize >= 100 ? 'high' : sampleSize >= 50 ? 'medium' : 'low';

    results.push({
      workType,
      withPermission: {
        count: withPermissionPrices.length,
        medianPricePerSqm: Math.round(withMedian),
        avgPricePerSqm: Math.round(average(withPermissionPrices)),
        properties: withPermissionDetails.slice(0, 10),
      },
      withoutPermission: {
        count: withoutPermissionPrices.length,
        medianPricePerSqm: Math.round(withoutMedian),
        avgPricePerSqm: Math.round(average(withoutPermissionPrices)),
      },
      premiumPercent: Math.round(premiumPercent * 10) / 10,
      confidence,
      sampleSize,
    });

    console.log(`With permission: ${withPermissionPrices.length} properties @ €${Math.round(withMedian)}/sqm median`);
    console.log(`Without permission: ${withoutPermissionPrices.length} properties @ €${Math.round(withoutMedian)}/sqm median`);
    console.log(`Premium: ${premiumPercent > 0 ? '+' : ''}${premiumPercent.toFixed(1)}% (${confidence} confidence)`);
  }

  return results;
}

function analyzeByPostcode(matches, allProperties) {
  console.log('\n\n========== ANALYSIS BY POSTCODE ==========\n');

  const matchedAddresses = new Set(matches.map(m => m.property.address));

  const byPostcode = new Map();
  for (const match of matches) {
    const postcode = match.property.dublinPostcode;
    if (!postcode) continue;
    const existing = byPostcode.get(postcode) || [];
    existing.push(match);
    byPostcode.set(postcode, existing);
  }

  const sortedPostcodes = [...byPostcode.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 15);

  for (const [postcode, postcodeMatches] of sortedPostcodes) {
    if (postcodeMatches.length < 3) continue;

    console.log(`\n--- ${postcode} ---`);

    const withPermissionPrices = [];
    const withoutPermissionPrices = [];

    for (const match of postcodeMatches) {
      const prop = match.property;
      if (prop.areaSqm && prop.areaSqm > 0) {
        withPermissionPrices.push(prop.soldPrice / prop.areaSqm);
      }

      const comparables = findComparables(prop, allProperties, matchedAddresses);
      for (const comp of comparables) {
        if (comp.areaSqm && comp.areaSqm > 0) {
          withoutPermissionPrices.push(comp.soldPrice / comp.areaSqm);
        }
      }
    }

    if (withPermissionPrices.length < 3 || withoutPermissionPrices.length < 5) {
      console.log(`Insufficient data`);
      continue;
    }

    const withMedian = median(withPermissionPrices);
    const withoutMedian = median(withoutPermissionPrices);
    const premium = ((withMedian - withoutMedian) / withoutMedian) * 100;

    console.log(`With permission: ${withPermissionPrices.length} @ €${Math.round(withMedian)}/sqm`);
    console.log(`Without: ${withoutPermissionPrices.length} @ €${Math.round(withoutMedian)}/sqm`);
    console.log(`Premium: ${premium > 0 ? '+' : ''}${premium.toFixed(1)}%`);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('PLANNING PERMISSION PREMIUM ANALYSIS');
  console.log('='.repeat(60));
  console.log('\nThis analysis compares sale prices of properties that had');
  console.log('planning permission granted vs similar properties without.\n');

  try {
    const properties = loadPropertyData();
    const planning = await fetchPlanningData();

    const matches = matchPlanningToProperties(planning, properties);

    if (matches.length === 0) {
      console.log('\nNo matches found. This could mean:');
      console.log('1. Address formats differ significantly between datasets');
      console.log('2. Properties with permission haven\'t sold yet');
      console.log('3. Matching criteria too strict');
      return;
    }

    console.log('\n\nSample matches (first 10):');
    console.log('-'.repeat(80));
    for (const match of matches.slice(0, 10)) {
      console.log(`Planning: ${match.planning.DevelopmentAddress}`);
      console.log(`Property: ${match.property.address}`);
      console.log(`Work: ${match.workType} | Score: ${match.matchScore} | Months after grant: ${match.monthsBetweenGrantAndSale}`);
      console.log(`Price: €${match.property.soldPrice.toLocaleString()} | €${Math.round(match.property.soldPrice / (match.property.areaSqm || 1))}/sqm`);
      console.log('-'.repeat(80));
    }

    console.log('\n\n========== ANALYSIS BY WORK TYPE ==========');
    const results = analyzeByWorkType(matches, properties);

    analyzeByPostcode(matches, properties);

    console.log('\n\n========== SUMMARY ==========\n');

    if (results.length === 0) {
      console.log('Insufficient data to draw conclusions.');
      console.log(`Found ${matches.length} matched properties but not enough comparables.`);
    } else {
      console.log('Work Type              | With Perm | Without  | Premium | Confidence');
      console.log('-'.repeat(70));
      for (const r of results.sort((a, b) => b.premiumPercent - a.premiumPercent)) {
        const premiumStr = r.premiumPercent > 0 ? `+${r.premiumPercent}%` : `${r.premiumPercent}%`;
        console.log(
          `${r.workType.padEnd(22)} | €${r.withPermission.medianPricePerSqm.toString().padStart(5)}/sqm | €${r.withoutPermission.medianPricePerSqm.toString().padStart(5)}/sqm | ${premiumStr.padStart(6)} | ${r.confidence}`
        );
      }

      const avgPremium = average(results.map(r => r.premiumPercent));
      console.log('\n');
      console.log(`Average premium across all work types: ${avgPremium > 0 ? '+' : ''}${avgPremium.toFixed(1)}%`);
      console.log(`Total sample size: ${results.reduce((a, r) => a + r.sampleSize, 0)} properties`);
    }

    const outputPath = path.join(__dirname, 'planning-premium-analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      totalMatches: matches.length,
      resultsByWorkType: results,
      sampleMatches: matches.slice(0, 50).map(m => ({
        planningAddress: m.planning.DevelopmentAddress,
        propertyAddress: m.property.address,
        workType: m.workType,
        matchScore: m.matchScore,
        soldPrice: m.property.soldPrice,
        pricePerSqm: m.property.areaSqm ? Math.round(m.property.soldPrice / m.property.areaSqm) : null,
        monthsAfterGrant: m.monthsBetweenGrantAndSale,
      })),
    }, null, 2));
    console.log(`\nDetailed results saved to: ${outputPath}`);

  } catch (error) {
    console.error('Analysis failed:', error);
    process.exit(1);
  }
}

main();
