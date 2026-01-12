const fs = require('fs');
const path = require('path');

// Load today's data
const todayData = JSON.parse(fs.readFileSync(path.join(__dirname, '../scraper/data/consolidated/data-2026-01-12.json'), 'utf8'));
const previousData = JSON.parse(fs.readFileSync(path.join(__dirname, '../scraper/data/consolidated/data-2026-01-04.json'), 'utf8'));

console.log('=== ANALYZING NEW DATA FROM JAN 12, 2026 ===\n');

// Get properties scraped on Jan 12
const newProperties = todayData.properties.filter(p => {
  if (!p.scrapedAt) return false;
  const scrapedDate = new Date(p.scrapedAt);
  return scrapedDate >= new Date('2026-01-12T00:00:00Z') && scrapedDate < new Date('2026-01-13T00:00:00Z');
});

console.log(`Properties scraped on Jan 12: ${newProperties.length}`);

// Also check for properties with sold dates in 2026
const recentSold = todayData.properties.filter(p => {
  if (!p.soldDate) return false;
  const soldDate = new Date(p.soldDate);
  return soldDate >= new Date('2026-01-01') && soldDate < new Date('2026-02-01');
});

console.log(`Properties sold in January 2026: ${recentSold.length}\n`);

// Compare total counts
const todayTotal = todayData.properties.length;
const previousTotal = previousData.properties.length;
const newTotal = todayTotal - previousTotal;

console.log(`Total properties in today's file: ${todayTotal}`);
console.log(`Total properties in previous file: ${previousTotal}`);
console.log(`New properties added: ${newTotal}\n`);

// If we have new properties, analyze them
const propertiesToAnalyze = newProperties.length > 0 ? newProperties : 
                            (newTotal > 0 ? todayData.properties.slice(-newTotal) : recentSold.slice(0, 100));

if (propertiesToAnalyze.length === 0) {
  console.log('No new properties found. Analyzing recent sales instead...');
  // Analyze most recent 200 properties
  const recentProperties = todayData.properties
    .filter(p => p.soldDate)
    .sort((a, b) => new Date(b.soldDate) - new Date(a.soldDate))
    .slice(0, 200);
  
  analyzeProperties(recentProperties, 'Recent 200 Properties');
} else {
  analyzeProperties(propertiesToAnalyze, 'New Properties from Jan 12');
}

function analyzeProperties(properties, label) {
  console.log(`\n=== ANALYSIS: ${label} (${properties.length} properties) ===\n`);
  
  // Basic stats
  const withPrice = properties.filter(p => p.soldPrice);
  const withAsking = properties.filter(p => p.askingPrice);
  const withOverUnder = properties.filter(p => p.overUnderPercent !== null && p.overUnderPercent !== undefined);
  
  console.log(`Properties with sold price: ${withPrice.length}`);
  console.log(`Properties with asking price: ${withAsking.length}`);
  console.log(`Properties with over/under %: ${withOverUnder.length}\n`);
  
  if (withPrice.length === 0) {
    console.log('No properties with price data to analyze.');
    return;
  }
  
  // Price analysis
  const prices = withPrice.map(p => p.soldPrice);
  const medianPrice = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)];
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  console.log('PRICE STATISTICS:');
  console.log(`  Median: €${medianPrice.toLocaleString()}`);
  console.log(`  Average: €${Math.round(avgPrice).toLocaleString()}`);
  console.log(`  Range: €${minPrice.toLocaleString()} - €${maxPrice.toLocaleString()}\n`);
  
  // Over-asking analysis
  if (withOverUnder.length > 0) {
    const overAsking = withOverUnder.filter(p => p.overUnderPercent > 0);
    const underAsking = withOverUnder.filter(p => p.overUnderPercent < 0);
    const atAsking = withOverUnder.filter(p => p.overUnderPercent === 0);
    
    const avgOverUnder = withOverUnder.reduce((sum, p) => sum + p.overUnderPercent, 0) / withOverUnder.length;
    
    console.log('OVER-ASKING ANALYSIS:');
    console.log(`  Properties over asking: ${overAsking.length} (${(overAsking.length / withOverUnder.length * 100).toFixed(1)}%)`);
    console.log(`  Properties under asking: ${underAsking.length} (${(underAsking.length / withOverUnder.length * 100).toFixed(1)}%)`);
    console.log(`  Properties at asking: ${atAsking.length} (${(atAsking.length / withOverUnder.length * 100).toFixed(1)}%)`);
    console.log(`  Average over/under: ${avgOverUnder.toFixed(2)}%\n`);
    
    if (overAsking.length > 0) {
      const overPercentages = overAsking.map(p => p.overUnderPercent);
      const maxOver = Math.max(...overPercentages);
      const avgOver = overPercentages.reduce((a, b) => a + b, 0) / overPercentages.length;
      console.log(`  Max over-asking: ${maxOver.toFixed(2)}%`);
      console.log(`  Average over-asking: ${avgOver.toFixed(2)}%\n`);
    }
  }
  
  // Property type analysis
  const byType = {};
  properties.forEach(p => {
    const type = p.propertyType || 'Unknown';
    if (!byType[type]) {
      byType[type] = { count: 0, prices: [], overAsking: [] };
    }
    byType[type].count++;
    if (p.soldPrice) byType[type].prices.push(p.soldPrice);
    if (p.overUnderPercent !== null && p.overUnderPercent !== undefined) {
      byType[type].overAsking.push(p.overUnderPercent);
    }
  });
  
  console.log('PROPERTY TYPE BREAKDOWN:');
  Object.entries(byType)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([type, data]) => {
      const median = data.prices.length > 0 
        ? data.prices.sort((a, b) => a - b)[Math.floor(data.prices.length / 2)]
        : null;
      const avgOver = data.overAsking.length > 0
        ? data.overAsking.reduce((a, b) => a + b, 0) / data.overAsking.length
        : null;
      console.log(`  ${type}: ${data.count} properties${median ? `, median €${median.toLocaleString()}` : ''}${avgOver ? `, avg over-asking ${avgOver.toFixed(2)}%` : ''}`);
    });
  console.log();
  
  // Bedroom analysis
  const byBeds = {};
  properties.forEach(p => {
    const beds = p.beds || 'Unknown';
    if (!byBeds[beds]) {
      byBeds[beds] = { count: 0, prices: [], overAsking: [] };
    }
    byBeds[beds].count++;
    if (p.soldPrice) byBeds[beds].prices.push(p.soldPrice);
    if (p.overUnderPercent !== null && p.overUnderPercent !== undefined) {
      byBeds[beds].overAsking.push(p.overUnderPercent);
    }
  });
  
  console.log('BEDROOM BREAKDOWN:');
  Object.entries(byBeds)
    .sort((a, b) => {
      if (a[0] === 'Unknown') return 1;
      if (b[0] === 'Unknown') return -1;
      return Number(a[0]) - Number(b[0]);
    })
    .forEach(([beds, data]) => {
      const median = data.prices.length > 0 
        ? data.prices.sort((a, b) => a - b)[Math.floor(data.prices.length / 2)]
        : null;
      const avgOver = data.overAsking.length > 0
        ? data.overAsking.reduce((a, b) => a + b, 0) / data.overAsking.length
        : null;
      console.log(`  ${beds} bed: ${data.count} properties${median ? `, median €${median.toLocaleString()}` : ''}${avgOver ? `, avg over-asking ${avgOver.toFixed(2)}%` : ''}`);
    });
  console.log();
  
  // Postcode analysis
  const byPostcode = {};
  properties.forEach(p => {
    const postcode = p.dublinPostcode || 'Unknown';
    if (!byPostcode[postcode]) {
      byPostcode[postcode] = { count: 0, prices: [], overAsking: [] };
    }
    byPostcode[postcode].count++;
    if (p.soldPrice) byPostcode[postcode].prices.push(p.soldPrice);
    if (p.overUnderPercent !== null && p.overUnderPercent !== undefined) {
      byPostcode[postcode].overAsking.push(p.overUnderPercent);
    }
  });
  
  console.log('POSTCODE BREAKDOWN (top 10):');
  Object.entries(byPostcode)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .forEach(([postcode, data]) => {
      const median = data.prices.length > 0 
        ? data.prices.sort((a, b) => a - b)[Math.floor(data.prices.length / 2)]
        : null;
      const avgOver = data.overAsking.length > 0
        ? data.overAsking.reduce((a, b) => a + b, 0) / data.overAsking.length
        : null;
      console.log(`  ${postcode}: ${data.count} properties${median ? `, median €${median.toLocaleString()}` : ''}${avgOver ? `, avg over-asking ${avgOver.toFixed(2)}%` : ''}`);
    });
  console.log();
  
  // Price per sqm analysis
  const withSqm = properties.filter(p => p.areaSqm && p.soldPrice);
  if (withSqm.length > 0) {
    const pricePerSqm = withSqm.map(p => p.soldPrice / p.areaSqm);
    const medianSqm = pricePerSqm.sort((a, b) => a - b)[Math.floor(pricePerSqm.length / 2)];
    const avgSqm = pricePerSqm.reduce((a, b) => a + b, 0) / pricePerSqm.length;
    
    console.log('PRICE PER SQUARE METER:');
    console.log(`  Properties with sqm data: ${withSqm.length}`);
    console.log(`  Median: €${Math.round(medianSqm).toLocaleString()}/sqm`);
    console.log(`  Average: €${Math.round(avgSqm).toLocaleString()}/sqm\n`);
  }
  
  // Yield analysis
  const withYield = properties.filter(p => p.yieldEstimate && p.yieldEstimate.grossYield);
  if (withYield.length > 0) {
    const yields = withYield.map(p => p.yieldEstimate.grossYield);
    const medianYield = yields.sort((a, b) => a - b)[Math.floor(yields.length / 2)];
    const avgYield = yields.reduce((a, b) => a + b, 0) / yields.length;
    
    console.log('YIELD ANALYSIS:');
    console.log(`  Properties with yield data: ${withYield.length}`);
    console.log(`  Median yield: ${medianYield.toFixed(2)}%`);
    console.log(`  Average yield: ${avgYield.toFixed(2)}%\n`);
  }
  
  // Date analysis
  const withSoldDate = properties.filter(p => p.soldDate);
  if (withSoldDate.length > 0) {
    const dates = withSoldDate.map(p => new Date(p.soldDate));
    const earliest = new Date(Math.min(...dates));
    const latest = new Date(Math.max(...dates));
    
    console.log('SOLD DATE RANGE:');
    console.log(`  Earliest: ${earliest.toISOString().split('T')[0]}`);
    console.log(`  Latest: ${latest.toISOString().split('T')[0]}\n`);
  }
}
