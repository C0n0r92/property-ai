#!/usr/bin/env node
/**
 * Parallel Update Script
 * 
 * Runs all scrapers in parallel, then consolidates the results.
 * Much faster than sequential execution.
 * 
 * Usage: npm run update:parallel
 */

import { spawn } from 'child_process';
import { promisify } from 'util';

const runCommand = (command: string, args: string[] = []): Promise<number> => {
  return new Promise((resolve, reject) => {
    const [cmd, ...cmdArgs] = command.split(' ');
    const child = spawn(cmd, [...cmdArgs, ...args], {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd()
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
};

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          PARALLEL SCRAPER UPDATE                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  // Run all scrapers in parallel
  console.log('🚀 Starting scrapers in parallel...\n');
  
  const scrapers = [
    { name: 'Sold Properties', cmd: 'npm run scrape:sold' },
    { name: 'Listings', cmd: 'npm run scrape:listings' },
    { name: 'Rentals', cmd: 'npm run scrape:rentals' },
  ];

  const results = await Promise.allSettled(
    scrapers.map(({ name, cmd }) => 
      runCommand(cmd).then(
        () => ({ name, success: true }),
        (error) => ({ name, success: false, error })
      )
    )
  );

  // Report results
  console.log('\n' + '═'.repeat(60));
  console.log('SCRAPER RESULTS');
  console.log('═'.repeat(60));
  
  let allSuccess = true;
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { name, success } = result.value;
      if (success) {
        console.log(`✅ ${name}: Success`);
      } else {
        console.log(`❌ ${name}: Failed`);
        allSuccess = false;
      }
    } else {
      console.log(`❌ Unknown: Failed`);
      allSuccess = false;
    }
  }

  // Run consolidation if at least one scraper succeeded
  if (allSuccess) {
    console.log('\n🔄 Consolidating data...\n');
    try {
      await runCommand('npm run consolidate');
      console.log('\n✅ Update complete!');
    } catch (error) {
      console.error('\n❌ Consolidation failed:', error);
      process.exit(1);
    }
  } else {
    console.log('\n⚠️  Some scrapers failed. Skipping consolidation.');
    console.log('   Run "npm run consolidate" manually after fixing issues.');
    process.exit(1);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n⏱️  Total time: ${elapsed}s`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});








