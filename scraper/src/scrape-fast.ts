import { chromium } from 'playwright';
import { writeFileSync, existsSync, readFileSync } from 'fs';

const OUTPUT_FILE = './data/properties.json';
const MAX_PAGES = 10277; // Full scrape

async function scrapeFast() {
  console.log('🏠 Daft.ie Property Scraper\n');
  
  // Load existing data if resuming
  let allProperties: any[] = [];
  let startPage = 1;
  
  if (existsSync(OUTPUT_FILE)) {
    try {
      const existing = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'));
      allProperties = existing;
      // Find the last page scraped
      if (allProperties.length > 0) {
        const lastUrl = allProperties[allProperties.length - 1].sourceUrl;
        const pageMatch = lastUrl?.match(/page=(\d+)/);
        startPage = pageMatch ? parseInt(pageMatch[1]) + 1 : 2;
        console.log(`📂 Resuming from page ${startPage} (${allProperties.length} properties already scraped)`);
      }
    } catch {
      console.log('📂 Starting fresh');
    }
  }
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    for (let pageNum = startPage; pageNum <= MAX_PAGES; pageNum++) {
      const url = pageNum === 1
        ? 'https://www.daft.ie/sold-properties/dublin'
        : `https://www.daft.ie/sold-properties/dublin?page=${pageNum}`;
      
      const elapsed = allProperties.length > 0 ? ` | ${allProperties.length} total` : '';
      console.log(`📍 Page ${pageNum}/${MAX_PAGES}: ${url}${elapsed}`);
      
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Handle cookies on first page
      if (pageNum === startPage && startPage === 1) {
        await page.waitForTimeout(2000);
        try {
          const btn = page.locator('button:has-text("Accept All")');
          if (await btn.isVisible({ timeout: 2000 })) {
            await btn.click();
            console.log('   🍪 Cookies accepted');
          }
        } catch {}
      }
      
      // Wait for cards
      await page.waitForSelector('[data-testid="card-container"]', { timeout: 10000 });
      const cards = page.locator('[data-testid="card-container"]');
      const count = await cards.count();
      
      // Extract data from all cards in one go using evaluate
      const sourceUrl = url;
      const pageData = await page.evaluate((sourceUrl) => {
        const cards = document.querySelectorAll('[data-testid="card-container"]');
        const results: any[] = [];
        
        cards.forEach((card) => {
          const text = card.textContent || '';
          
          // Extract data using regex on the text content
          const dateMatch = text.match(/SOLD (\d{2}\/\d{2}\/\d{4})/);
          // Match prices - they always end with ,000 or similar
          const soldMatch = text.match(/Sold:\s*€([\d,]+,\d{3})/);
          const askingMatch = text.match(/Asking:\s*€([\d,]+,\d{3})/);
          
          if (!dateMatch || !soldMatch || !askingMatch) return;
          
          // Extract address (between date and "Sold:")
          const dateIdx = text.indexOf(dateMatch[0]);
          const soldIdx = text.indexOf('Sold:');
          const address = text.substring(dateIdx + dateMatch[0].length, soldIdx).trim();
          
          if (!address || address.length < 10) return;
          
          // Extract other details
          const bedsMatch = text.match(/(\d+)\s*Bed/);
          const bathsMatch = text.match(/(\d+)\s*Bath/);
          const areaMatch = text.match(/([\d.]+)\s*m²/);
          const typeMatch = text.match(/(Semi-D|Detached|Apartment|Terrace|Bungalow|Duplex|Townhouse|End of Terrace|Site)/i);
          
          const soldPrice = soldMatch[1];
          const askingPrice = askingMatch[1];
          const sold = parseFloat(soldPrice.replace(/,/g, ''));
          const asking = parseFloat(askingPrice.replace(/,/g, ''));
          const percent = ((sold - asking) / asking) * 100;
          const overUnder = percent > 0 ? `+${percent.toFixed(1)}%` : `${percent.toFixed(1)}%`;
          
          results.push({
            soldDate: dateMatch[1],
            address,
            soldPrice,
            askingPrice,
            overUnder,
            beds: bedsMatch ? bedsMatch[1] : '',
            baths: bathsMatch ? bathsMatch[1] : '',
            area: areaMatch ? `${areaMatch[1]}m²` : '',
            propertyType: typeMatch ? typeMatch[1] : '',
            sourceUrl
          });
        });
        
        return results;
      }, sourceUrl);
      
      allProperties.push(...pageData);
      
      // Save after every page
      writeFileSync(OUTPUT_FILE, JSON.stringify(allProperties, null, 2));
      console.log(`   ✅ +${pageData.length} properties (total: ${allProperties.length}) - saved`);
    }
    
    console.log(`\n✅ Done! Total properties: ${allProperties.length}`);
    console.log(`💾 Saved to ${OUTPUT_FILE}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.log(`💾 Progress saved to ${OUTPUT_FILE} (${allProperties.length} properties)`);
  } finally {
    await browser.close();
  }
}

scrapeFast().catch(console.error);

