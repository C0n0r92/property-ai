import { chromium, type Browser, type Page } from 'playwright';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { DEFAULT_CONFIG, TEST_CONFIG, getRandomUserAgent, getRandomDelay } from './config.js';
import { parsePropertyCard } from './parser.js';
import type { ScrapedProperty, ScrapeConfig, ScrapeProgress } from './types.js';

// Check if running in test mode
const isTestMode = process.argv.includes('--test');
const config: ScrapeConfig = isTestMode ? TEST_CONFIG : DEFAULT_CONFIG;

console.log(`🏠 Daft.ie Property Scraper`);
console.log(`📍 Location: ${config.location}`);
console.log(`⏱️  Delay: ${config.delayMs}ms between requests`);
if (config.maxPages) {
  console.log(`📄 Max pages: ${config.maxPages} (test mode)`);
}
console.log('');

// Storage for scraped properties
let properties: ScrapedProperty[] = [];
let progress: ScrapeProgress = {
  currentPage: 0,
  totalPages: 0,
  propertiesScraped: 0,
  lastScrapedAt: new Date().toISOString(),
  errors: [],
};

// Ensure output directory exists
function ensureOutputDir() {
  const dir = dirname(config.outputFile);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// Save progress to file
function saveProgress() {
  ensureOutputDir();
  writeFileSync(config.outputFile, JSON.stringify(properties, null, 2));
  console.log(`💾 Saved ${properties.length} properties to ${config.outputFile}`);
}

// Load existing progress if resuming
function loadExistingProgress(): ScrapedProperty[] {
  if (existsSync(config.outputFile)) {
    try {
      const data = readFileSync(config.outputFile, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
  return [];
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle cookie consent popup
async function handleCookieConsent(page: Page): Promise<void> {
  try {
    // Look for "Accept All" button
    const acceptButton = page.locator('button:has-text("Accept All")');
    if (await acceptButton.isVisible({ timeout: 2000 })) {
      await acceptButton.click();
      console.log('🍪 Accepted cookie consent');
    }
  } catch {
    // No cookie popup or already accepted
  }
}

// Get total number of pages from pagination
async function getTotalPages(page: Page): Promise<number> {
  try {
    // Look for pagination info like "1 - 20 of 205,539 total results"
    const resultText = await page.locator('text=/\\d+ - \\d+ of [\\d,]+ total results/').textContent();
    if (resultText) {
      const match = resultText.match(/of\s+([\d,]+)\s+total/);
      if (match) {
        const totalResults = parseInt(match[1].replace(/,/g, ''), 10);
        return Math.ceil(totalResults / 20); // 20 results per page
      }
    }
    
    // Fallback: look for last page number in pagination
    const lastPageLink = await page.locator('nav[aria-label="pagination"] a').last().textContent();
    if (lastPageLink) {
      const pageNum = parseInt(lastPageLink.replace(/,/g, ''), 10);
      if (!isNaN(pageNum)) return pageNum;
    }
    
    return 1;
  } catch {
    return 1;
  }
}

// Scrape a single page of listings
async function scrapePage(page: Page, pageNum: number): Promise<ScrapedProperty[]> {
  const pageProperties: ScrapedProperty[] = [];
  
  try {
    // Find all property cards
    const cards = page.locator('[data-testid="card-container"]');
    const cardCount = await cards.count();
    
    console.log(`   Found ${cardCount} property cards on page ${pageNum}`);
    
    for (let i = 0; i < cardCount; i++) {
      try {
        const card = cards.nth(i);
        
        // Get the entire card's text content - this is more reliable
        const cardText = await card.textContent();
        
        if (!cardText || cardText.trim().length === 0) {
          continue; // Skip empty cards
        }
        
        // Get the URL
        const linkElement = card.locator('a').first();
        const href = await linkElement.getAttribute('href').catch(() => null);
        const url = href ? `https://www.daft.ie${href}` : '';
        
        // Get BER rating if available
        let berRating: string | undefined;
        const berElement = card.locator('[class*="ber_"]');
        if (await berElement.count() > 0) {
          const berClass = await berElement.first().getAttribute('class').catch(() => '');
          const berMatch = berClass?.match(/ber_([A-G]\d?)_/i);
          if (berMatch) berRating = berMatch[1].toUpperCase();
        }
        
        // Parse the card text to extract data
        // Extract sold date
        const dateMatch = cardText.match(/SOLD (\d{2}\/\d{2}\/\d{4})/);
        const soldDateText = dateMatch ? dateMatch[0] : '';
        
        // Extract prices
        const soldMatch = cardText.match(/Sold:\s*€([\d,]+)/);
        const askingMatch = cardText.match(/Asking:\s*€([\d,]+)/);
        
        const priceText = soldMatch && askingMatch ? 
          `Sold: €${soldMatch[1]} Asking: €${askingMatch[1]}` : '';
        
        // Extract address (between date and "Sold:")
        let address = '';
        if (dateMatch && soldMatch) {
          const afterDate = cardText.substring(cardText.indexOf(dateMatch[0]) + dateMatch[0].length);
          const beforeSold = afterDate.substring(0, afterDate.indexOf('Sold:'));
          address = beforeSold.trim();
        }
        
        // Extract beds/baths/area/type
        const bedsMatch = cardText.match(/(\d+)\s*Bed/);
        const bathsMatch = cardText.match(/(\d+)\s*Bath/);
        const areaMatch = cardText.match(/([\d.]+)\s*m²/);
        const typeMatch = cardText.match(/(Semi-D|Detached|Apartment|Terrace|Bungalow|Duplex|Townhouse|End of Terrace|Site)/i);
        
        const metaTexts: string[] = [];
        if (bedsMatch) metaTexts.push(`${bedsMatch[1]} Bed`);
        if (bathsMatch) metaTexts.push(`${bathsMatch[1]} Bath`);
        if (areaMatch) metaTexts.push(`${areaMatch[1]} m²`);
        if (typeMatch) metaTexts.push(typeMatch[1]);
        
        // Parse into structured property
        const property = parsePropertyCard({
          url,
          address: address.trim(),
          priceText: priceText.trim(),
          soldDateText,
          metaTexts,
          berRating,
          agent: undefined, // Agent extraction disabled for now
        });
        
        if (property) {
          pageProperties.push(property);
        }
      } catch (cardError) {
        console.warn(`   ⚠️ Error parsing card ${i + 1}: ${cardError}`);
      }
    }
  } catch (error) {
    console.error(`   ❌ Error scraping page ${pageNum}: ${error}`);
    progress.errors.push(`Page ${pageNum}: ${error}`);
  }
  
  return pageProperties;
}

// Main scraper function
async function scrape(): Promise<void> {
  console.log('🚀 Starting scraper...\n');
  
  // Load any existing data
  properties = loadExistingProgress();
  if (properties.length > 0) {
    console.log(`📂 Loaded ${properties.length} existing properties`);
  }
  
  let browser: Browser | null = null;
  
  try {
    // Launch browser
    browser = await chromium.launch({
      headless: true,
    });
    
    const context = await browser.newContext({
      userAgent: getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 },
    });
    
    const page = await context.newPage();
    
    // Navigate to first page
    const firstPageUrl = `${config.baseUrl}/${config.location}`;
    console.log(`📍 Navigating to: ${firstPageUrl}`);
    await page.goto(firstPageUrl, { waitUntil: 'networkidle' });
    
    // Handle cookie consent
    await handleCookieConsent(page);
    
    // Get total pages
    progress.totalPages = await getTotalPages(page);
    if (config.maxPages) {
      progress.totalPages = Math.min(progress.totalPages, config.maxPages);
    }
    console.log(`📄 Total pages to scrape: ${progress.totalPages}\n`);
    
    // Scrape each page
    for (let pageNum = 1; pageNum <= progress.totalPages; pageNum++) {
      progress.currentPage = pageNum;
      console.log(`📄 Scraping page ${pageNum}/${progress.totalPages}...`);
      
      // Navigate to page (if not first page)
      if (pageNum > 1) {
        const pageUrl = `${config.baseUrl}/${config.location}?page=${pageNum}`;
        await page.goto(pageUrl, { waitUntil: 'networkidle' });
      }
      
      // Wait for results to load
      await page.waitForSelector('[data-testid="card-container"]', { timeout: 10000 });
      
      // Scrape the page
      const pageProperties = await scrapePage(page, pageNum);
      properties.push(...pageProperties);
      progress.propertiesScraped = properties.length;
      
      console.log(`   ✅ Scraped ${pageProperties.length} properties (total: ${properties.length})\n`);
      
      // Save progress periodically (every 10 pages)
      if (pageNum % 10 === 0) {
        saveProgress();
      }
      
      // Delay before next page
      if (pageNum < progress.totalPages) {
        const delay = getRandomDelay(config.delayMs);
        console.log(`   ⏳ Waiting ${delay}ms before next page...`);
        await sleep(delay);
      }
    }
    
    // Final save
    saveProgress();
    
    console.log('\n✅ Scraping complete!');
    console.log(`📊 Total properties scraped: ${properties.length}`);
    console.log(`📁 Output file: ${config.outputFile}`);
    
    if (progress.errors.length > 0) {
      console.log(`\n⚠️ Errors encountered: ${progress.errors.length}`);
      progress.errors.forEach(err => console.log(`   - ${err}`));
    }
    
  } catch (error) {
    console.error('❌ Scraper error:', error);
    // Save whatever we have
    if (properties.length > 0) {
      saveProgress();
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the scraper
scrape().catch(console.error);


