import { spawn, ChildProcess } from 'child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';

// Configuration
const TOTAL_PAGES = 10277;
const NUM_WORKERS = 6;
const TEST_MODE = false; // Set to true for testing with small ranges
const TEST_PAGES_PER_WORKER = 3; // Pages per worker in test mode

const DATA_DIR = './data';
const OUTPUT_FILE = join(DATA_DIR, 'properties.json');

interface WorkerConfig {
  id: number;
  startPage: number;
  endPage: number;
  outputFile: string;
}

function calculateWorkerRanges(): WorkerConfig[] {
  const totalPages = TEST_MODE ? TEST_PAGES_PER_WORKER * NUM_WORKERS : TOTAL_PAGES;
  const pagesPerWorker = Math.ceil(totalPages / NUM_WORKERS);
  
  const configs: WorkerConfig[] = [];
  
  for (let i = 0; i < NUM_WORKERS; i++) {
    const startPage = i * pagesPerWorker + 1;
    const endPage = Math.min((i + 1) * pagesPerWorker, totalPages);
    
    configs.push({
      id: i + 1,
      startPage,
      endPage,
      outputFile: join(DATA_DIR, `properties-${i + 1}.json`)
    });
  }
  
  return configs;
}

function spawnWorker(config: WorkerConfig): ChildProcess {
  console.log(`Starting Worker ${config.id}: pages ${config.startPage}-${config.endPage}`);
  
  const worker = spawn('npx', [
    'tsx',
    'src/worker.ts',
    '--worker-id', config.id.toString(),
    '--start-page', config.startPage.toString(),
    '--end-page', config.endPage.toString(),
    '--output-file', config.outputFile
  ], {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  return worker;
}

function mergeResults(configs: WorkerConfig[]): void {
  console.log('\nMerging results...');
  
  let allProperties: any[] = [];
  
  for (const config of configs) {
    if (existsSync(config.outputFile)) {
      try {
        const data = JSON.parse(readFileSync(config.outputFile, 'utf-8'));
        console.log(`  Worker ${config.id}: ${data.length} properties`);
        allProperties.push(...data);
      } catch (error) {
        console.error(`  Worker ${config.id}: Failed to read ${config.outputFile}`);
      }
    } else {
      console.log(`  Worker ${config.id}: No output file found`);
    }
  }
  
  // Sort by date (newest first)
  allProperties.sort((a, b) => {
    const dateA = a.soldDate.split('/').reverse().join('');
    const dateB = b.soldDate.split('/').reverse().join('');
    return dateB.localeCompare(dateA);
  });
  
  writeFileSync(OUTPUT_FILE, JSON.stringify(allProperties, null, 2));
  console.log(`\nMerged ${allProperties.length} properties into ${OUTPUT_FILE}`);
}

function cleanupWorkerFiles(configs: WorkerConfig[]): void {
  console.log('\nCleaning up worker files...');
  for (const config of configs) {
    if (existsSync(config.outputFile)) {
      unlinkSync(config.outputFile);
      console.log(`  Deleted ${config.outputFile}`);
    }
  }
}

async function main() {
  console.log('🏠 Parallel Property Scraper\n');
  console.log(`Mode: ${TEST_MODE ? 'TEST' : 'FULL'}`);
  console.log(`Workers: ${NUM_WORKERS}`);
  
  const configs = calculateWorkerRanges();
  
  console.log('\nPage ranges:');
  configs.forEach(c => console.log(`  Worker ${c.id}: pages ${c.startPage}-${c.endPage}`));
  console.log('');
  
  // Spawn all workers
  const workers = configs.map(config => ({
    config,
    process: spawnWorker(config)
  }));
  
  // Wait for all workers to complete
  const results = await Promise.all(
    workers.map(({ config, process: worker }) => 
      new Promise<{ config: WorkerConfig; exitCode: number | null }>((resolve) => {
        worker.on('close', (code) => {
          resolve({ config, exitCode: code });
        });
      })
    )
  );
  
  console.log('\n--- All workers finished ---\n');
  
  // Check results
  const failed = results.filter(r => r.exitCode !== 0);
  if (failed.length > 0) {
    console.log(`Warning: ${failed.length} worker(s) failed`);
    failed.forEach(f => console.log(`  Worker ${f.config.id} exited with code ${f.exitCode}`));
  }
  
  // Merge results
  mergeResults(configs);
  
  // Ask before cleanup
  console.log('\nKeeping worker files for inspection.');
  console.log('Run with --cleanup to remove them after verification.');
  
  if (process.argv.includes('--cleanup')) {
    cleanupWorkerFiles(configs);
  }
  
  console.log('\n✅ Done!');
}

main().catch(console.error);

