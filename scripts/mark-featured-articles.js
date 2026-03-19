#!/usr/bin/env node

/**
 * Mark specific articles as featured by updating their metadata files
 */

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '../dashboard/public/blog-content');

// Articles to mark as featured (based on original BlogIndexClient)
const featuredSlugs = [
  'dublin-spring-2026-market-outlook',
  'first-time-buyer-bracket-analysis',
  'dublin-street-type-momentum',
  'dublin-corner-house-discount',
  'dublin-suburban-over-asking-hotspots',
  'dublin-property-prices-since-covid',
  'dublin-rental-affordability-crisis',
  'value-erosion-2021-2025',
  'dublin-d5-area-analysis',
  'dublin-conservative-market-strategy',
  'dublin-rental-market-hotspots',
  'compare-properties-complete-guide'
];

console.log(`🏷️  Marking ${featuredSlugs.length} articles as featured...\n`);

let updated = 0;
let notFound = 0;

for (const slug of featuredSlugs) {
  try {
    const metaPath = path.join(CONTENT_DIR, `${slug}.meta.json`);

    if (!fs.existsSync(metaPath)) {
      console.log(`⚠️  ${slug} - metadata file not found`);
      notFound++;
      continue;
    }

    const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    metadata.featured = true;
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');
    console.log(`✅ ${slug}`);
    updated++;
  } catch (error) {
    console.error(`❌ ${slug}: ${error.message}`);
  }
}

console.log(`\n✨ Updated ${updated} articles, ${notFound} not found`);
