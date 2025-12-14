import type { ScrapeConfig } from './types.js';

// Default configuration
export const DEFAULT_CONFIG: ScrapeConfig = {
  baseUrl: 'https://www.daft.ie/sold-properties',
  location: 'dublin',
  delayMs: 500, // 0.5 seconds between requests
  outputFile: './data/properties.json',
};

// Test configuration (fewer pages)
export const TEST_CONFIG: ScrapeConfig = {
  ...DEFAULT_CONFIG,
  maxPages: 5, // Only scrape 5 pages for testing
  outputFile: './data/properties-test.json',
};

// Dublin areas we want to scrape
export const DUBLIN_AREAS = [
  'dublin', // All of Dublin county
  // Can add specific areas later:
  // 'dublin-4',
  // 'dublin-6',
  // 'dublin-8',
  // 'ranelagh-dublin',
  // 'rathmines-dublin-6',
];

// User agents to rotate (helps avoid detection)
export const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export function getRandomDelay(baseDelay: number): number {
  // Add random jitter: 0.5x to 1.5x the base delay
  const jitter = 0.5 + Math.random();
  return Math.floor(baseDelay * jitter);
}


