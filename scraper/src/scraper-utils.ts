/**
 * Shared utilities for Daft.ie scrapers
 * Handles common functionality like cookie acceptance, page navigation, and base scraper class
 */

import { chromium, Page, Browser, BrowserContext } from 'playwright';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Base scraper class that handles the common pagination pattern:
 * 1. Accept cookies/popups at start
 * 2. Collect all data on current page
 * 3. Scroll to bottom to ensure pagination is visible
 * 4. Navigate to next page
 */
export abstract class BaseDaftScraper<T> {
  protected page: Page;
  protected browser: Browser;
  protected context: BrowserContext;
  protected currentPage: number = 1;

  constructor(protected baseUrl: string) {}

  /**
   * Initialize browser and page
   */
  protected async initializeBrowser(): Promise<void> {
    this.browser = await chromium.launch({ headless: false });
    this.context = await this.browser.newContext(createBrowserContextOptions());
    this.page = await this.context.newPage();
  }

  /**
   * Navigate to initial URL and handle popups
   */
  protected async navigateToInitialPage(): Promise<void> {
    console.log(`Going to ${this.baseUrl}...`);
    await this.page.goto(this.baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Accept cookies and dismiss popups
    await acceptCookiesAndPopups(this.page);
  }

  /**
   * Main scraping loop - handles the common pagination pattern
   */
  protected async runScrapingLoop(
    maxPages: number = Infinity,
    maxListings?: number
  ): Promise<T[]> {
    const allData: T[] = [];
    let totalListings = 0;

    while (this.currentPage <= maxPages && (maxListings === undefined || totalListings < maxListings)) {
      console.log(`\n--- Page ${this.currentPage}/${maxPages === Infinity ? '∞' : maxPages} ---`);

      // Step 1: Collect all data from current page
      const pageData = await this.collectDataFromPage(this.currentPage);
      console.log(`Found ${pageData.length} items on page ${this.currentPage}`);

      // Process each item
      for (const item of pageData) {
        if (maxListings !== undefined && totalListings >= maxListings) break;

        const processedItem = await this.processItem(item);
        if (processedItem) {
          allData.push(processedItem);
          totalListings++;
        }
      }

      // Step 2: Scroll to bottom to ensure pagination button is visible
      await this.scrollToBottom();

      // Step 3: Check if there's a next page and navigate
      const hasNextPage = await this.navigateToNextPage();
      if (!hasNextPage) {
        console.log('Reached last page');
        break;
      }

      this.currentPage++;
    }

    return allData;
  }

  /**
   * Scroll to bottom of page
   */
  protected async scrollToBottom(): Promise<void> {
    console.log('Scrolling to bottom...');
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.page.waitForTimeout(1000);
  }

  /**
   * Navigate to next page using pagination button
   */
  protected async navigateToNextPage(): Promise<boolean> {
    try {
      const nextBtn = this.page.locator('[data-testid="next-page-link"]');

      if (await nextBtn.isVisible({ timeout: 3000 })) {
        await nextBtn.click();
        await this.page.waitForTimeout(2000); // Wait for page to load

        console.log(`✅ Navigated to page ${this.currentPage + 1}`);
        return true;
      } else {
        console.log('No next page button found - reached end');
        return false;
      }
    } catch (error) {
      console.log(`⚠️ Navigation to page ${this.currentPage + 1} failed:`, error.message);
      return false;
    }
  }

  /**
   * Abstract method - implement in subclasses to extract data from page
   */
  protected abstract collectDataFromPage(pageNum: number): Promise<any[]>;

  /**
   * Abstract method - implement in subclasses to process individual items
   * Return null to skip an item, or processed item data
   */
  protected abstract processItem(rawItem: any): Promise<T | null>;

  /**
   * Cleanup browser resources
   */
  protected async cleanup(): Promise<void> {
    try {
      await this.browser.close();
    } catch (closeError) {
      console.warn('Error closing browser:', closeError);
    }
  }
}

/**
 * Accept Daft.ie cookies and dismiss popups
 */
export async function acceptCookiesAndPopups(page: Page): Promise<void> {
  console.log('Accepting cookies and dismissing popups...');

  // Accept cookies immediately - they often appear before page load completes
  try {
    await page.waitForTimeout(500); // Brief wait for popup

    const cookieSelectors = [
      '[id="didomi-notice-agree-button"]', // Daft.ie specific
      '#didomi-notice-agree-button', // Also try ID selector
      'button:has-text("Accept All")',
      'button:has-text("Accept")',
      'button:has-text("I Accept")',
      'button:has-text("Accept all")',
      'button:has-text("Accept cookies")',
      'button[data-testid*="accept"]',
      'button[data-testid*="cookie"]',
      '[data-testid="accept-all-cookies"]',
      '.cookie-accept button',
      '.gdpr-consent button',
      'button[class*="accept"]',
      'button[class*="cookie"]',
      'a:has-text("Accept")',
      'a:has-text("Accept All")'
    ];

    for (const selector of cookieSelectors) {
      try {
        const cookieBtn = page.locator(selector).first();
        if (await cookieBtn.isVisible({ timeout: 1000 })) {
          await cookieBtn.click();
          console.log(`✅ Cookies accepted using: ${selector}`);
          await page.waitForTimeout(500);
          break;
        }
      } catch {}
    }

    // Also try clicking any button with cookie-related text
    try {
      const allButtons = await page.locator('button, a').all();
      for (const btn of allButtons.slice(0, 10)) { // Check first 10 buttons
        try {
          const text = await btn.textContent();
          if (text && /accept|cookie|consent|agree/i.test(text)) {
            await btn.click();
            console.log(`✅ Cookies accepted by text match: "${text.trim()}"`);
            await page.waitForTimeout(500);
            break;
          }
        } catch {}
      }
    } catch {}

  } catch (error) {
    console.log('⚠️ Cookie acceptance failed:', error.message);
  }

  // Dismiss any additional popups/overlays
  try {
    const dismissSelectors = [
      'button:has-text("Close")',
      'button:has-text("×")',
      'button:has-text("X")',
      '.modal-close',
      '.popup-close',
      '.overlay-close',
      '[data-testid*="close"]',
      '[aria-label*="close"]',
      '.cookie-banner-close',
      '.gdpr-close'
    ];

    for (const selector of dismissSelectors) {
      try {
        const closeBtn = page.locator(selector).first();
        if (await closeBtn.isVisible({ timeout: 500 })) {
          await closeBtn.click();
          console.log(`✅ Dismissed popup using: ${selector}`);
          await page.waitForTimeout(300);
        }
      } catch {}
    }
  } catch {}

  // Human-like behavior: random delay and mouse movement
  const delay = 2000 + Math.random() * 3000;
  await page.waitForTimeout(delay);

  await page.mouse.move(
    Math.random() * 800 + 100,
    Math.random() * 600 + 100
  );
  await page.waitForTimeout(500);
}

/**
 * Navigate to next page using scroll + next button click
 * Returns true if successfully navigated to next page, false if no more pages
 */
export async function navigateToNextPage(page: Page, currentPage: number): Promise<boolean> {
  try {
    // Scroll to bottom to ensure next button is visible
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // Look for next page button
    const nextBtn = page.locator('[data-testid="next-page-link"]');

    if (await nextBtn.isVisible({ timeout: 3000 })) {
      await nextBtn.click();
      await page.waitForTimeout(2000); // Wait for page to load

      console.log(`✅ Navigated to page ${currentPage + 1}`);
      return true;
    } else {
      console.log('No next page button found - reached end');
      return false;
    }
  } catch (error) {
    console.log(`⚠️ Navigation to page ${currentPage + 1} failed:`, error.message);
    return false;
  }
}

/**
 * Navigate to next page using infinite scroll
 * Returns true if new content was loaded, false if no more content
 */
export async function scrollToLoadMore(page: Page, currentPage: number): Promise<boolean> {
  try {
    const beforeScrollCount = await page.locator('[data-testid="card-container"]').count();

    // Scroll to bottom to trigger infinite scroll
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(3000); // Wait for infinite scroll to load

    const afterScrollCount = await page.locator('[data-testid="card-container"]').count();
    console.log(`   Scrolled: ${beforeScrollCount} → ${afterScrollCount} cards`);

    if (afterScrollCount > beforeScrollCount) {
      console.log(`✅ Loaded more content on page ${currentPage + 1}`);
      return true;
    } else {
      console.log('No new content loaded - reached end');
      return false;
    }
  } catch (error) {
    console.log(`⚠️ Scroll loading failed on page ${currentPage + 1}:`, error.message);
    return false;
  }
}

/**
 * Create browser context with anti-detection settings
 */
export function createBrowserContextOptions() {
  return {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
    locale: 'en-GB',
    timezoneId: 'Europe/Dublin',
    permissions: ['geolocation'],
    geolocation: { latitude: 53.3498, longitude: -6.2603 }, // Dublin coordinates
  };
}
