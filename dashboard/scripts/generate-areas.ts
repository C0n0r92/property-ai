/**
 * Generate clean DUBLIN_AREAS list from actual property data
 * Filters out generic/invalid area names
 */

import { loadProperties, getAreaStats } from '../src/lib/data';

// Blacklist of invalid area names (too generic, street names, etc.)
const INVALID_AREAS = new Set([
  'dublin',      // Too generic
  'co',          // "Co." prefix
  'co.',
  'county',
  'city',
  'main st',     // Street names
  'station road',
  'grove ave',
  'grove avenue',
  'brewery rd',
  'brewery road',
  'malahide road',
  'malahide rd',
  'stillorgan rd',
  'upper glenageary road',
  'wicklow',     // Not Dublin
  'bray',        // Not Dublin (Co. Wicklow)
]);

async function generateCleanAreas() {
  console.log('Loading property data...');
  const properties = await loadProperties();
  console.log(`Loaded ${properties.length} properties`);
  
  console.log('\nGenerating area statistics...');
  const areaStats = getAreaStats(properties);
  
  // Filter areas with at least 5 sales
  const viableAreas = areaStats
    .filter(area => {
      const nameLower = area.name.toLowerCase();
      
      // Skip blacklisted areas
      if (INVALID_AREAS.has(nameLower)) {
        console.log(`  ❌ Skipping: "${area.name}" (blacklisted)`);
        return false;
      }
      
      // Skip if too few sales
      if (area.count < 5) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => b.count - a.count);
  
  console.log(`\nFound ${viableAreas.length} valid areas with 5+ sales`);
  
  // Helper to extract district number if present
  const extractDistrict = (name: string): number | null => {
    const match = name.match(/Dublin\s*(\d+)/i);
    return match ? parseInt(match[1]) : null;
  };
  
  // Helper to check if name is a Dublin district
  const isDistrict = (name: string): boolean => {
    return /^Dublin\s*\d+\w?$/i.test(name);
  };
  
  // Helper to normalize area names (remove ", Dublin X" suffix but NOT if it's the main district)
  const normalizeAreaName = (name: string): string => {
    if (isDistrict(name)) {
      return name;
    }
    return name.replace(/,\s*Dublin\s*\d+\w?$/i, '').trim();
  };
  
  // Helper to create slug
  const createSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  };
  
  // Group areas and deduplicate
  const areaMap = new Map<string, { name: string; count: number; district: number | null }>();
  
  viableAreas.forEach(area => {
    const normalized = normalizeAreaName(area.name);
    if (!normalized) return;
    
    const slug = createSlug(normalized);
    const district = extractDistrict(area.name);
    
    if (areaMap.has(slug)) {
      const existing = areaMap.get(slug)!;
      if (area.count > existing.count) {
        areaMap.set(slug, { name: normalized, count: area.count, district });
      }
    } else {
      areaMap.set(slug, { name: normalized, count: area.count, district });
    }
  });
  
  // Generate TypeScript code
  const areas = Array.from(areaMap.values())
    .sort((a, b) => {
      const aIsDistrict = /^Dublin\s*\d+/i.test(a.name);
      const bIsDistrict = /^Dublin\s*\d+/i.test(b.name);
      
      if (aIsDistrict && !bIsDistrict) return -1;
      if (!aIsDistrict && bIsDistrict) return 1;
      
      if (aIsDistrict && bIsDistrict) {
        return (a.district || 0) - (b.district || 0);
      }
      
      return a.name.localeCompare(b.name);
    });
  
  console.log('\n\n=== GENERATED DUBLIN_AREAS CODE ===\n');
  console.log('// List of all Dublin districts and named areas');
  console.log('// AUTO-GENERATED from property data - areas with 5+ sales');
  console.log('export const DUBLIN_AREAS = [');
  
  let inDistricts = true;
  areas.forEach((area, i) => {
    const isDistArea = /^Dublin\s*\d+/i.test(area.name);
    if (inDistricts && !isDistArea) {
      console.log('  \n  // Named areas (neighborhoods with sufficient data)');
      inDistricts = false;
    }
    
    const slug = createSlug(area.name);
    const district = area.district !== null ? area.district : 'null';
    console.log(`  { name: '${area.name}', slug: '${slug}', district: ${district} },`);
  });
  
  console.log('];');
  
  console.log(`\n\nTotal areas: ${areas.length}`);
  console.log(`This will create ${areas.length} SEO-optimized pages!`);
  console.log(`\nIncludes ${areas.filter(a => /^Dublin\s*\d+/i.test(a.name)).length} districts and ${areas.filter(a => !/^Dublin\s*\d+/i.test(a.name)).length} named neighborhoods.`);
}

generateCleanAreas().catch(console.error);
