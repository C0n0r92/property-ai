import { chromium } from 'playwright';
import { writeFileSync, existsSync, readFileSync } from 'fs';

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const index = args.indexOf(`--${name}`);
  return index !== -1 ? args[index + 1] : undefined;
};

const startPage = parseInt(getArg('start-page') || '1');
const endPage = parseInt(getArg('end-page') || '10');
const outputFile = getArg('output-file') || './data/properties-worker.json';
const workerId = getArg('worker-id') || '1';

async function runWorker() {
  console.log(`[Worker ${workerId}] Starting: pages ${startPage}-${endPage} -> ${outputFile}`);
  
  // Load existing data if resuming
  let properties: any[] = [];
  let currentPage = startPage;
  
  if (existsSync(outputFile)) {
    try {
      properties = JSON.parse(readFileSync(outputFile, 'utf-8'));
      if (properties.length > 0) {
        const lastUrl = properties[properties.length - 1].sourceUrl;
        const pageMatch = lastUrl?.match(/page=(\d+)/);
        const lastPage = pageMatch ? parseInt(pageMatch[1]) : 1;
        currentPage = Math.min(lastPage + 1, endPage + 1);
        if (currentPage > endPage) {
          console.log(`[Worker ${workerId}] Already complete (${properties.length} properties)`);
          return;
        }
        console.log(`[Worker ${workerId}] Resuming from page ${currentPage} (${properties.length} properties)`);
      }
    } catch {
      // Start fresh
    }
  }
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    for (let pageNum = currentPage; pageNum <= endPage; pageNum++) {
      const url = pageNum === 1
        ? 'https://www.daft.ie/sold-properties/dublin'
        : `https://www.daft.ie/sold-properties/dublin?page=${pageNum}`;
      
      console.log(`[Worker ${workerId}] Page ${pageNum}/${endPage}`);
      
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Wait for page to render
      await page.waitForTimeout(2000);
      
      // Handle cookies on first page of this worker's range
      if (pageNum === currentPage) {
        try {
          const btn = page.locator('button:has-text("Accept All")');
          if (await btn.isVisible({ timeout: 3000 })) {
            await btn.click();
            await page.waitForTimeout(1000);
          }
        } catch {}
      }
      
      // Wait for cards
      await page.waitForSelector('[data-testid="card-container"]', { timeout: 15000 });
      
      // Extract data
      const sourceUrl = url;
      const pageData = await page.evaluate((sourceUrl) => {
        const cards = document.querySelectorAll('[data-testid="card-container"]');
        const results: any[] = [];
        
        cards.forEach((card) => {
          const text = card.textContent || '';
          
          const dateMatch = text.match(/SOLD (\d{2}\/\d{2}\/\d{4})/);
          const soldMatch = text.match(/Sold:\s*€([\d,]+,\d{3})/);
          const askingMatch = text.match(/Asking:\s*€([\d,]+,\d{3})/);
          
          if (!dateMatch || !soldMatch || !askingMatch) return;
          
          const dateIdx = text.indexOf(dateMatch[0]);
          const soldIdx = text.indexOf('Sold:');
          const address = text.substring(dateIdx + dateMatch[0].length, soldIdx).trim();
          
          if (!address || address.length < 10) return;
          
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
      
      properties.push(...pageData);
      
      // Save after every page
      writeFileSync(outputFile, JSON.stringify(properties, null, 2));
      console.log(`[Worker ${workerId}] +${pageData.length} (total: ${properties.length})`);
    }
    
    console.log(`[Worker ${workerId}] Complete! ${properties.length} properties saved to ${outputFile}`);
    
  } catch (error) {
    console.error(`[Worker ${workerId}] Error:`, error);
    console.log(`[Worker ${workerId}] Progress saved (${properties.length} properties)`);
  } finally {
    await browser.close();
  }
}

runWorker().catch(console.error);

