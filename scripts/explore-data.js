const fs = require('fs');

const data = JSON.parse(fs.readFileSync('dashboard/public/data.json', 'utf8'));

console.log('Total properties:', data.properties.length);

// Check date ranges
const dates = data.properties.map(p => p.soldDate).filter(Boolean);
const validDates = dates.filter(d => d.startsWith('2024') || d.startsWith('2025'));
console.log('\nValid 2024-2025 properties:', validDates.length);

// Check postcodes
const postcodes = {};
data.properties.forEach(p => {
  if (p.dublinPostcode && (p.soldDate?.startsWith('2024') || p.soldDate?.startsWith('2025'))) {
    postcodes[p.dublinPostcode] = (postcodes[p.dublinPostcode] || 0) + 1;
  }
});
console.log('\nTop postcodes (2024-2025):');
Object.entries(postcodes).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([code, count]) => {
  console.log(`  ${code}: ${count}`);
});

// Check property types
const types = {};
data.properties.forEach(p => {
  if (p.propertyType && (p.soldDate?.startsWith('2024') || p.soldDate?.startsWith('2025'))) {
    types[p.propertyType] = (types[p.propertyType] || 0) + 1;
  }
});
console.log('\nProperty types (2024-2025):');
Object.entries(types).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});

// Check D8 and D12
const d8 = data.properties.filter(p => p.dublinPostcode === 'D8' && (p.soldDate?.startsWith('2024') || p.soldDate?.startsWith('2025')));
const d12 = data.properties.filter(p => p.dublinPostcode === 'D12' && (p.soldDate?.startsWith('2024') || p.soldDate?.startsWith('2025')));
console.log(`\nD8 properties: ${d8.length}`);
console.log(`D12 properties: ${d12.length}`);

// Check for price per sqm data
const withPricePerSqm = data.properties.filter(p => p.pricePerSqm && p.areaSqm && (p.soldDate?.startsWith('2024') || p.soldDate?.startsWith('2025')));
console.log(`\nProperties with price/sqm: ${withPricePerSqm.length}`);
