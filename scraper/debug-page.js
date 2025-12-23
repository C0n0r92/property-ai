#!/usr/bin/env node
/**
 * Debug script to inspect Daft.ie page structure
 */

import { chromium } from 'playwright';

async function debugPage() {
  console.log('🔍 Inspecting Daft.ie page structure...\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    console.log('📍 Going to sold properties page...');
    await page.goto('https://www.daft.ie/sold-properties/dublin', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for page to load
    await page.waitForTimeout(3000);

    console.log('📊 Page Info:');
    console.log('Title:', await page.title());
    console.log('URL:', page.url());

    // Check for various selectors
    console.log('\n🔍 Checking selectors:');

    const selectors = [
      '[data-testid="card-container"]',
      '[data-testid="property-card"]',
      '.PropertyCard',
      '.property-card',
      '[data-testid="search-result"]',
      '.SearchResult',
      '.result',
      'article',
      '.card',
      '[class*="card"]',
      '[class*="property"]'
    ];

    for (const selector of selectors) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`✅ ${selector}: ${count} found`);
        }
      } catch (e) {
        // ignore
      }
    }

    // Check body content for clues
    const bodyText = await page.locator('body').textContent();
    console.log('\n📝 Page content analysis:');
    console.log('Contains "property":', bodyText.includes('property'));
    console.log('Contains "sold":', bodyText.includes('sold'));
    console.log('Contains "card":', bodyText.includes('card'));
    console.log('Contains "result":', bodyText.includes('result'));
    console.log('Length:', bodyText.length);

    // Look for any elements that might contain property data
    console.log('\n🔍 Looking for property-related elements:');
    const allDivs = await page.locator('div').all();
    let propertyDivs = 0;
    for (const div of allDivs.slice(0, 50)) { // Check first 50 divs
      try {
        const text = await div.textContent();
        if (text && (
          text.toLowerCase().includes('sold') ||
          text.toLowerCase().includes('€') ||
          text.toLowerCase().includes('bed')
        )) {
          propertyDivs++;
        }
      } catch (e) {
        // ignore
      }
    }
    console.log(`Divs with property-like content: ${propertyDivs}`);

    // Try to find any clickable elements
    console.log('\n🔗 Checking for pagination:');
    const paginationSelectors = [
      '[data-testid="next-page-link"]',
      'a[href*="page="]',
      'button',
      '[class*="pagination"]',
      '[class*="next"]'
    ];

    for (const selector of paginationSelectors) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`✅ ${selector}: ${count} found`);
        }
      } catch (e) {
        // ignore
      }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await browser.close();
  }
}

debugPage().catch(console.error);
