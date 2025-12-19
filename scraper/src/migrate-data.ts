#!/usr/bin/env node
/**
 * Migration Script
 * 
 * Moves existing data files to the new directory structure:
 *   - data/properties.json → data/sold/sold-initial.json
 *   - data/listings.json → data/listings/listings-latest.json
 *   - data/rentals.json → data/rentals/rentals-latest.json
 * 
 * Safe to run multiple times - checks if files exist first.
 * 
 * Usage: npx tsx src/migrate-data.ts
 */

import { existsSync, mkdirSync, copyFileSync, renameSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = './data';

const MIGRATIONS = [
  {
    from: join(DATA_DIR, 'properties.json'),
    to: join(DATA_DIR, 'sold', 'sold-initial.json'),
    description: 'Sold properties → data/sold/',
  },
  {
    from: join(DATA_DIR, 'listings.json'),
    to: join(DATA_DIR, 'listings', 'listings-latest.json'),
    description: 'For-sale listings → data/listings/',
  },
  {
    from: join(DATA_DIR, 'rentals.json'),
    to: join(DATA_DIR, 'rentals', 'rentals-latest.json'),
    description: 'Rental listings → data/rentals/',
  },
];

function ensureDir(filePath: string): void {
  const dir = filePath.substring(0, filePath.lastIndexOf('/'));
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`  Created directory: ${dir}`);
  }
}

function migrate() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║               DATA MIGRATION SCRIPT                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  let migrated = 0;
  let skipped = 0;
  
  for (const { from, to, description } of MIGRATIONS) {
    console.log(`📁 ${description}`);
    
    if (!existsSync(from)) {
      console.log(`   ⏭️  Source not found: ${from}`);
      skipped++;
      continue;
    }
    
    if (existsSync(to)) {
      console.log(`   ⏭️  Target already exists: ${to}`);
      skipped++;
      continue;
    }
    
    // Ensure target directory exists
    ensureDir(to);
    
    // Copy file (keeping original as backup)
    try {
      copyFileSync(from, to);
      
      // Verify the copy
      const sourceSize = readFileSync(from).length;
      const targetSize = readFileSync(to).length;
      
      if (sourceSize === targetSize) {
        console.log(`   ✅ Copied: ${from} → ${to}`);
        migrated++;
      } else {
        console.log(`   ❌ Copy verification failed!`);
      }
    } catch (e) {
      console.log(`   ❌ Error: ${e}`);
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log(`Migrated: ${migrated} files`);
  console.log(`Skipped: ${skipped} files`);
  
  if (migrated > 0) {
    console.log(`
⚠️  Original files have been COPIED (not moved).
   Once you verify the migration worked, you can delete:
   - ${MIGRATIONS.map(m => m.from).join('\n   - ')}
   
   Or keep them as backups.

Next steps:
   1. Run 'npm run consolidate' to generate the combined data.json
   2. Verify your dashboard still works
   3. Optionally delete old files from data/ root
`);
  }
}

migrate();
