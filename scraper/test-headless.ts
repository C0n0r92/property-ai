#!/usr/bin/env node
/**
 * Quick test to verify headless mode works
 * Just navigates to Daft.ie and checks if we can see property listings
 */

import { chromium } from 'playwright';
import { createBrowserContextOptions } from './src/scraper-utils.js';

async function testHeadless() {
  console.log('🧪 Testing headless browser mode...\n');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ]
  });
  
  const context = await browser.newContext(createBrowserContextOptions());
  const page = await context.newPage();
  
  try {
    console.log('📍 Navigating to Daft.ie...');
    await page.goto('https://www.daft.ie/property-for-sale/ireland', { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });
    
    console.log('✅ Page loaded');
    
    // Check if we can see property listings
    await page.waitForSelector('[data-testid="results"]', { timeout: 10000 });
    const listingCount = await page.locator('[data-testid="card-container"]').count();
    
    console.log(`✅ Found ${listingCount} property listings`);
    console.log('✅ Headless mode works!\n');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

testHeadless()
  .then(() => {
    console.log('🎉 All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });

