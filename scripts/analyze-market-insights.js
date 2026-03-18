/**
 * Market Insights Analysis
 *
 * Extracts valuable trends from our 45K+ property dataset:
 * 1. Bidding wars by postcode and property type
 * 2. Seasonal patterns in prices and over/under asking
 * 3. Price trends over time
 * 4. "Extended" properties in descriptions vs price premium
 *
 * Run: node scripts/analyze-market-insights.js
 */

const fs = require('fs');
const path = require('path');

function loadPropertyData() {
  const dataPath = path.join(__dirname, '../dashboard/public/data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  return data.properties || data;
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

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)];
}

// ========== ANALYSIS 1: BIDDING WARS ==========
function analyzeBiddingWars(properties) {
  console.log('\n' + '='.repeat(60));
  console.log('ANALYSIS 1: BIDDING WARS BY POSTCODE & PROPERTY TYPE');
  console.log('='.repeat(60));

  // Filter to properties with over/under asking data
  const withOverUnder = properties.filter(p =>
    p.overUnderPercent !== undefined &&
    p.overUnderPercent !== null &&
    p.dublinPostcode &&
    p.soldPrice
  );

  console.log(`\nProperties with over/under asking data: ${withOverUnder.length}`);

  // By postcode
  const byPostcode = new Map();
  for (const p of withOverUnder) {
    const list = byPostcode.get(p.dublinPostcode) || [];
    list.push(p);
    byPostcode.set(p.dublinPostcode, list);
  }

  const postcodeStats = [];
  for (const [postcode, props] of byPostcode) {
    if (props.length < 50) continue;

    const overAsking = props.filter(p => p.overUnderPercent > 0);
    const percentOverAsking = (overAsking.length / props.length) * 100;
    const avgPremium = average(overAsking.map(p => p.overUnderPercent));
    const maxPremium = Math.max(...props.map(p => p.overUnderPercent));

    postcodeStats.push({
      postcode,
      count: props.length,
      percentOverAsking: Math.round(percentOverAsking * 10) / 10,
      avgPremium: Math.round(avgPremium * 10) / 10,
      maxPremium: Math.round(maxPremium * 10) / 10,
    });
  }

  postcodeStats.sort((a, b) => b.percentOverAsking - a.percentOverAsking);

  console.log('\n--- MOST COMPETITIVE POSTCODES (Bidding Wars) ---');
  console.log('Postcode | Sales | % Over Asking | Avg Premium | Max Premium');
  console.log('-'.repeat(60));
  for (const s of postcodeStats.slice(0, 15)) {
    console.log(`${s.postcode.padEnd(8)} | ${s.count.toString().padStart(5)} | ${(s.percentOverAsking + '%').padStart(13)} | ${('+' + s.avgPremium + '%').padStart(11)} | +${s.maxPremium}%`);
  }

  // By property type
  const byType = new Map();
  for (const p of withOverUnder) {
    if (!p.propertyType) continue;
    const list = byType.get(p.propertyType) || [];
    list.push(p);
    byType.set(p.propertyType, list);
  }

  console.log('\n--- BY PROPERTY TYPE ---');
  console.log('Type             | Sales | % Over Asking | Avg Premium');
  console.log('-'.repeat(55));

  const typeStats = [];
  for (const [type, props] of byType) {
    if (props.length < 100) continue;
    const overAsking = props.filter(p => p.overUnderPercent > 0);
    const percentOverAsking = (overAsking.length / props.length) * 100;
    const avgPremium = average(overAsking.map(p => p.overUnderPercent));
    typeStats.push({ type, count: props.length, percentOverAsking, avgPremium });
  }

  typeStats.sort((a, b) => b.percentOverAsking - a.percentOverAsking);
  for (const s of typeStats) {
    console.log(`${s.type.padEnd(16)} | ${s.count.toString().padStart(5)} | ${(Math.round(s.percentOverAsking) + '%').padStart(13)} | +${Math.round(s.avgPremium * 10) / 10}%`);
  }

  return { postcodeStats, typeStats };
}

// ========== ANALYSIS 2: SEASONAL PATTERNS ==========
function analyzeSeasonalPatterns(properties) {
  console.log('\n' + '='.repeat(60));
  console.log('ANALYSIS 2: SEASONAL PATTERNS');
  console.log('='.repeat(60));

  const withDates = properties.filter(p => p.scrapedAt && p.soldPrice);

  // Group by month
  const byMonth = new Map();
  for (const p of withDates) {
    const date = new Date(p.scrapedAt);
    const month = date.getMonth(); // 0-11
    const list = byMonth.get(month) || [];
    list.push(p);
    byMonth.set(month, list);
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  console.log('\n--- SALES BY MONTH ---');
  console.log('Month | Sales | Median Price | Median €/sqm | % Over Asking');
  console.log('-'.repeat(60));

  const monthStats = [];
  for (let m = 0; m < 12; m++) {
    const props = byMonth.get(m) || [];
    if (props.length < 100) continue;

    const medianPrice = median(props.map(p => p.soldPrice));
    const propsWithSqm = props.filter(p => p.areaSqm && p.areaSqm > 0);
    const medianPricePerSqm = median(propsWithSqm.map(p => p.soldPrice / p.areaSqm));

    const withOverUnder = props.filter(p => p.overUnderPercent !== undefined);
    const overAsking = withOverUnder.filter(p => p.overUnderPercent > 0);
    const percentOver = withOverUnder.length > 0 ? (overAsking.length / withOverUnder.length) * 100 : 0;

    monthStats.push({
      month: m,
      name: monthNames[m],
      count: props.length,
      medianPrice,
      medianPricePerSqm: Math.round(medianPricePerSqm),
      percentOverAsking: Math.round(percentOver),
    });

    console.log(`${monthNames[m].padEnd(5)} | ${props.length.toString().padStart(5)} | €${Math.round(medianPrice).toLocaleString().padStart(10)} | €${Math.round(medianPricePerSqm).toLocaleString().padStart(6)}/sqm | ${Math.round(percentOver)}%`);
  }

  // Find best/worst months
  const sortedByPrice = [...monthStats].sort((a, b) => b.medianPricePerSqm - a.medianPricePerSqm);
  console.log(`\nHighest €/sqm: ${sortedByPrice[0].name} (€${sortedByPrice[0].medianPricePerSqm}/sqm)`);
  console.log(`Lowest €/sqm: ${sortedByPrice[sortedByPrice.length - 1].name} (€${sortedByPrice[sortedByPrice.length - 1].medianPricePerSqm}/sqm)`);

  const sortedByCompetition = [...monthStats].sort((a, b) => b.percentOverAsking - a.percentOverAsking);
  console.log(`\nMost competitive: ${sortedByCompetition[0].name} (${sortedByCompetition[0].percentOverAsking}% over asking)`);
  console.log(`Least competitive: ${sortedByCompetition[sortedByCompetition.length - 1].name} (${sortedByCompetition[sortedByCompetition.length - 1].percentOverAsking}% over asking)`);

  return monthStats;
}

// ========== ANALYSIS 3: EXTENDED/RENOVATED PROPERTIES ==========
function analyzeExtendedProperties(properties) {
  console.log('\n' + '='.repeat(60));
  console.log('ANALYSIS 3: "EXTENDED" PROPERTIES IN LISTINGS');
  console.log('='.repeat(60));

  // Look for keywords in address/description that suggest extended/renovated
  const extensionKeywords = [
    /\bextended\b/i,
    /\bextension\b/i,
    /\brenovated\b/i,
    /\brefurbished\b/i,
    /\bmodernised\b/i,
    /\bmodernized\b/i,
    /\battic conversion\b/i,
    /\bloft conversion\b/i,
    /\bfully upgraded\b/i,
  ];

  const withSqm = properties.filter(p => p.areaSqm && p.areaSqm > 0 && p.soldPrice && p.dublinPostcode);

  const extended = [];
  const notExtended = [];

  for (const p of withSqm) {
    const searchText = (p.address || '') + ' ' + (p.description || '');
    const isExtended = extensionKeywords.some(kw => kw.test(searchText));

    if (isExtended) {
      extended.push(p);
    } else {
      notExtended.push(p);
    }
  }

  console.log(`\nProperties mentioning extension/renovation: ${extended.length}`);
  console.log(`Properties without mention: ${notExtended.length}`);

  // Compare by postcode where we have enough data
  const postcodes = [...new Set(extended.map(p => p.dublinPostcode))];

  console.log('\n--- EXTENDED vs NON-EXTENDED BY POSTCODE ---');
  console.log('Postcode | Extended €/sqm | Non-Extended | Premium');
  console.log('-'.repeat(55));

  const results = [];
  for (const postcode of postcodes) {
    const extInPostcode = extended.filter(p => p.dublinPostcode === postcode);
    const nonExtInPostcode = notExtended.filter(p => p.dublinPostcode === postcode);

    if (extInPostcode.length < 5 || nonExtInPostcode.length < 20) continue;

    const extMedian = median(extInPostcode.map(p => p.soldPrice / p.areaSqm));
    const nonExtMedian = median(nonExtInPostcode.map(p => p.soldPrice / p.areaSqm));
    const premium = ((extMedian - nonExtMedian) / nonExtMedian) * 100;

    results.push({
      postcode,
      extendedCount: extInPostcode.length,
      nonExtendedCount: nonExtInPostcode.length,
      extendedMedian: Math.round(extMedian),
      nonExtendedMedian: Math.round(nonExtMedian),
      premium: Math.round(premium * 10) / 10,
    });
  }

  results.sort((a, b) => b.premium - a.premium);

  for (const r of results.slice(0, 15)) {
    const premiumStr = r.premium > 0 ? `+${r.premium}%` : `${r.premium}%`;
    console.log(`${r.postcode.padEnd(8)} | €${r.extendedMedian}/sqm (${r.extendedCount}) | €${r.nonExtendedMedian}/sqm (${r.nonExtendedCount}) | ${premiumStr}`);
  }

  // Overall
  if (extended.length >= 20 && notExtended.length >= 100) {
    const overallExtMedian = median(extended.map(p => p.soldPrice / p.areaSqm));
    const overallNonExtMedian = median(notExtended.map(p => p.soldPrice / p.areaSqm));
    const overallPremium = ((overallExtMedian - overallNonExtMedian) / overallNonExtMedian) * 100;

    console.log(`\n--- OVERALL ---`);
    console.log(`Extended properties: €${Math.round(overallExtMedian)}/sqm (n=${extended.length})`);
    console.log(`Non-extended: €${Math.round(overallNonExtMedian)}/sqm (n=${notExtended.length})`);
    console.log(`Premium for "extended": ${overallPremium > 0 ? '+' : ''}${Math.round(overallPremium * 10) / 10}%`);
  }

  return results;
}

// ========== ANALYSIS 4: PRICE TRENDS OVER TIME ==========
function analyzePriceTrends(properties) {
  console.log('\n' + '='.repeat(60));
  console.log('ANALYSIS 4: PRICE TRENDS OVER TIME');
  console.log('='.repeat(60));

  const withDates = properties.filter(p =>
    p.scrapedAt && p.soldPrice && p.areaSqm && p.areaSqm > 0
  );

  // Group by quarter
  const byQuarter = new Map();
  for (const p of withDates) {
    const date = new Date(p.scrapedAt);
    const year = date.getFullYear();
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const key = `${year}-Q${quarter}`;

    const list = byQuarter.get(key) || [];
    list.push(p);
    byQuarter.set(key, list);
  }

  console.log('\n--- QUARTERLY PRICE TRENDS ---');
  console.log('Quarter  | Sales | Median Price | Median €/sqm | QoQ Change');
  console.log('-'.repeat(65));

  const quarters = [...byQuarter.keys()].sort();
  let prevMedian = null;

  const quarterStats = [];
  for (const q of quarters) {
    const props = byQuarter.get(q);
    if (props.length < 50) continue;

    const medianPrice = median(props.map(p => p.soldPrice));
    const medianPricePerSqm = median(props.map(p => p.soldPrice / p.areaSqm));

    let qoqChange = null;
    if (prevMedian !== null) {
      qoqChange = ((medianPricePerSqm - prevMedian) / prevMedian) * 100;
    }

    quarterStats.push({
      quarter: q,
      count: props.length,
      medianPrice,
      medianPricePerSqm: Math.round(medianPricePerSqm),
      qoqChange: qoqChange !== null ? Math.round(qoqChange * 10) / 10 : null,
    });

    const changeStr = qoqChange !== null
      ? (qoqChange > 0 ? `+${qoqChange.toFixed(1)}%` : `${qoqChange.toFixed(1)}%`)
      : 'N/A';

    console.log(`${q.padEnd(8)} | ${props.length.toString().padStart(5)} | €${Math.round(medianPrice).toLocaleString().padStart(10)} | €${Math.round(medianPricePerSqm).toLocaleString().padStart(6)}/sqm | ${changeStr}`);

    prevMedian = medianPricePerSqm;
  }

  return quarterStats;
}

// ========== ANALYSIS 5: SIZE MATTERS ==========
function analyzeSizeImpact(properties) {
  console.log('\n' + '='.repeat(60));
  console.log('ANALYSIS 5: SIZE vs PRICE PER SQM');
  console.log('='.repeat(60));

  const withSqm = properties.filter(p =>
    p.areaSqm && p.areaSqm > 0 && p.soldPrice && p.dublinPostcode
  );

  // Size buckets
  const buckets = [
    { label: 'Tiny (<50sqm)', min: 0, max: 50 },
    { label: 'Small (50-75sqm)', min: 50, max: 75 },
    { label: 'Medium (75-100sqm)', min: 75, max: 100 },
    { label: 'Large (100-150sqm)', min: 100, max: 150 },
    { label: 'Very Large (150-200sqm)', min: 150, max: 200 },
    { label: 'Mansion (200+sqm)', min: 200, max: Infinity },
  ];

  console.log('\n--- PRICE PER SQM BY SIZE ---');
  console.log('Size Bucket          | Count | Median €/sqm | vs Medium');
  console.log('-'.repeat(55));

  let mediumMedian = null;
  const sizeStats = [];

  for (const bucket of buckets) {
    const inBucket = withSqm.filter(p => p.areaSqm >= bucket.min && p.areaSqm < bucket.max);
    if (inBucket.length < 50) continue;

    const medianPricePerSqm = median(inBucket.map(p => p.soldPrice / p.areaSqm));

    if (bucket.label.includes('Medium')) {
      mediumMedian = medianPricePerSqm;
    }

    sizeStats.push({
      label: bucket.label,
      count: inBucket.length,
      medianPricePerSqm: Math.round(medianPricePerSqm),
    });
  }

  for (const s of sizeStats) {
    const vsMedium = mediumMedian
      ? ((s.medianPricePerSqm - mediumMedian) / mediumMedian) * 100
      : null;
    const vsMediumStr = vsMedium !== null
      ? (vsMedium > 0 ? `+${Math.round(vsMedium)}%` : `${Math.round(vsMedium)}%`)
      : 'N/A';

    console.log(`${s.label.padEnd(20)} | ${s.count.toString().padStart(5)} | €${s.medianPricePerSqm.toLocaleString().padStart(6)}/sqm | ${vsMediumStr}`);
  }

  console.log('\nInsight: Smaller properties typically have HIGHER €/sqm (premium for location/convenience)');
  console.log('Larger properties have LOWER €/sqm (bulk discount effect)');

  return sizeStats;
}

// ========== MAIN ==========
async function main() {
  console.log('='.repeat(60));
  console.log('DUBLIN PROPERTY MARKET INSIGHTS');
  console.log('='.repeat(60));
  console.log('\nLoading property data...');

  const properties = loadPropertyData();
  console.log(`Loaded ${properties.length} properties`);

  // Run all analyses
  const biddingWars = analyzeBiddingWars(properties);
  const seasonal = analyzeSeasonalPatterns(properties);
  const extended = analyzeExtendedProperties(properties);
  const trends = analyzePriceTrends(properties);
  const size = analyzeSizeImpact(properties);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY: KEY INSIGHTS FOR AGENTS');
  console.log('='.repeat(60));

  console.log('\n1. BIDDING WARS:');
  console.log(`   - Most competitive: ${biddingWars.postcodeStats[0]?.postcode} (${biddingWars.postcodeStats[0]?.percentOverAsking}% over asking)`);
  console.log(`   - Least competitive: ${biddingWars.postcodeStats[biddingWars.postcodeStats.length - 1]?.postcode}`);

  console.log('\n2. SEASONAL PATTERNS:');
  const sortedSeasonal = [...seasonal].sort((a, b) => b.percentOverAsking - a.percentOverAsking);
  console.log(`   - Most competitive month: ${sortedSeasonal[0]?.name}`);
  console.log(`   - Least competitive month: ${sortedSeasonal[sortedSeasonal.length - 1]?.name}`);

  console.log('\n3. PRICE TRENDS:');
  if (trends.length >= 2) {
    const latest = trends[trends.length - 1];
    const yearAgo = trends.find(t => {
      const [y1] = latest.quarter.split('-Q');
      const [y2] = t.quarter.split('-Q');
      return parseInt(y1) - parseInt(y2) === 1;
    });
    if (yearAgo) {
      const yoyChange = ((latest.medianPricePerSqm - yearAgo.medianPricePerSqm) / yearAgo.medianPricePerSqm) * 100;
      console.log(`   - YoY change: ${yoyChange > 0 ? '+' : ''}${Math.round(yoyChange * 10) / 10}%`);
    }
    console.log(`   - Latest median: €${latest.medianPricePerSqm}/sqm`);
  }

  // Save results
  const outputPath = path.join(__dirname, 'market-insights-analysis.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalProperties: properties.length,
    biddingWars,
    seasonal,
    extendedProperties: extended,
    priceTrends: trends,
    sizeImpact: size,
  }, null, 2));

  console.log(`\nFull results saved to: ${outputPath}`);
}

main().catch(console.error);
