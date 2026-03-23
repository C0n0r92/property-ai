/**
 * An Bord Pleanala Decisions Pipeline
 *
 * Scrapes strategic housing development decisions from An Bord Pleanala website.
 * Focuses on large-scale residential developments (typically 100+ units).
 *
 * Data source: https://www.pleanala.ie/en-IE/Case
 *
 * Usage:
 * - npm run scrape:abp              # Scrape ABP decisions
 * - npm run scrape:abp -- --pages 5 # Limit pages
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { geocodeAddress } from './geocode.js';
import { createBrowserContextOptions } from './scraper-utils.js';

dotenv.config();

// Types
interface ABPDecision {
  case_ref: string;
  case_type: string;
  location: string;
  address: string;
  description: string;
  units_count: number | null;
  floor_area_sqm: number | null;
  development_type: string;
  decision: string;
  decision_date: string | null;
  appeal_date: string | null;
  applicant: string;
  planning_authority: string;
  latitude: number | null;
  longitude: number | null;
  county: string;
  case_url: string;
}

// Configuration
const CONFIG = {
  baseUrl: 'https://www.pleanala.ie/en-IE/Case',
  searchUrl: 'https://www.pleanala.ie/en-IE/Case/Search',
  delayMs: 3000,
  maxPages: 50,
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

// Dublin counties to filter
const DUBLIN_COUNTIES = [
  'Dublin',
  'Dublin City',
  'South Dublin',
  'Fingal',
  'Dún Laoghaire-Rathdown',
  'Dun Laoghaire Rathdown',
];

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class ABPScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing browser...');

    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const contextOptions = createBrowserContextOptions();
    this.context = await this.browser.newContext({
      ...contextOptions,
      userAgent: CONFIG.userAgent,
    });

    this.page = await this.context.newPage();
  }

  async acceptCookies(): Promise<void> {
    if (!this.page) return;

    const cookieSelectors = [
      'button:has-text("Accept All")',
      'button:has-text("Accept")',
      'button[id*="accept"]',
      '#onetrust-accept-btn-handler',
    ];

    for (const selector of cookieSelectors) {
      try {
        const btn = await this.page.$(selector);
        if (btn) {
          await btn.click();
          console.log('✓ Accepted cookies');
          await delay(1000);
          return;
        }
      } catch {
        // Try next selector
      }
    }
  }

  async searchDublinCases(): Promise<void> {
    if (!this.page) return;

    console.log('🔍 Navigating to ABP case search...');

    await this.page.goto(CONFIG.searchUrl, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    await this.acceptCookies();
    await delay(2000);

    // Try to select Dublin from county dropdown if available
    try {
      const countySelect = await this.page.$('select[name*="county"], select[id*="county"]');
      if (countySelect) {
        await countySelect.selectOption({ label: 'Dublin' });
        console.log('✓ Selected Dublin county');
      }
    } catch {
      console.log('⚠️ Could not select county filter');
    }

    // Search for SHD (Strategic Housing Development) cases
    try {
      const typeSelect = await this.page.$('select[name*="type"], select[id*="type"]');
      if (typeSelect) {
        // Try to select SHD option
        const options = await typeSelect.$$('option');
        for (const opt of options) {
          const text = await opt.textContent();
          if (text?.toLowerCase().includes('strategic') || text?.toLowerCase().includes('shd')) {
            const value = await opt.getAttribute('value');
            if (value) {
              await typeSelect.selectOption(value);
              console.log('✓ Selected Strategic Housing Development type');
              break;
            }
          }
        }
      }
    } catch {
      console.log('⚠️ Could not select case type filter');
    }

    // Submit search
    try {
      const searchBtn = await this.page.$('button[type="submit"], input[type="submit"], button:has-text("Search")');
      if (searchBtn) {
        await searchBtn.click();
        await this.page.waitForLoadState('networkidle');
        console.log('✓ Search submitted');
      }
    } catch {
      console.log('⚠️ Could not submit search, using default results');
    }

    await delay(2000);
  }

  async extractCasesFromPage(): Promise<ABPDecision[]> {
    if (!this.page) return [];

    const cases = await this.page.evaluate((dublinCounties) => {
      const results: any[] = [];

      // Find case rows in the results table
      const rows = document.querySelectorAll('table tbody tr, .case-list-item, [class*="case-row"]');

      rows.forEach((row) => {
        try {
          // Extract case reference
          const refEl = row.querySelector('a[href*="/Case/"], td:first-child a, [class*="case-ref"]');
          const caseRef = refEl?.textContent?.trim() || '';
          const caseUrl = refEl?.getAttribute('href') || '';

          if (!caseRef) return;

          // Extract other fields from cells
          const cells = row.querySelectorAll('td');
          const rowText = row.textContent || '';

          // Try to extract location/county
          let location = '';
          let county = '';
          cells.forEach((cell) => {
            const text = cell.textContent?.trim() || '';
            if (dublinCounties.some((c: string) => text.includes(c))) {
              county = text;
              location = text;
            }
          });

          // Only include Dublin cases
          if (!dublinCounties.some((c: string) => rowText.includes(c))) {
            return;
          }

          // Extract decision
          let decision = '';
          if (rowText.toLowerCase().includes('granted') || rowText.toLowerCase().includes('grant')) {
            decision = 'Granted';
          } else if (rowText.toLowerCase().includes('refused') || rowText.toLowerCase().includes('refuse')) {
            decision = 'Refused';
          } else if (rowText.toLowerCase().includes('withdrawn')) {
            decision = 'Withdrawn';
          } else {
            decision = 'Pending';
          }

          // Extract date (look for date patterns)
          const dateMatch = rowText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
          const decisionDate = dateMatch ? dateMatch[1] : null;

          // Extract description if available
          const descEl = row.querySelector('[class*="description"], [class*="details"]');
          const description = descEl?.textContent?.trim() || '';

          // Extract units count from description
          const unitsMatch = (description + rowText).match(/(\d+)\s*(?:units?|dwellings?|apartments?|houses?)/i);
          const unitsCount = unitsMatch ? parseInt(unitsMatch[1]) : null;

          results.push({
            case_ref: caseRef,
            case_url: caseUrl.startsWith('http') ? caseUrl : `https://www.pleanala.ie${caseUrl}`,
            location,
            county,
            decision,
            decision_date: decisionDate,
            description,
            units_count: unitsCount,
          });
        } catch (e) {
          // Skip problematic rows
        }
      });

      return results;
    }, DUBLIN_COUNTIES);

    return cases.map((c) => ({
      case_ref: c.case_ref,
      case_type: 'Strategic Housing Development',
      location: c.location,
      address: c.location,
      description: c.description,
      units_count: c.units_count,
      floor_area_sqm: null,
      development_type: 'Residential',
      decision: c.decision,
      decision_date: this.parseDate(c.decision_date),
      appeal_date: null,
      applicant: '',
      planning_authority: c.county,
      latitude: null,
      longitude: null,
      county: this.normalizeCounty(c.county),
      case_url: c.case_url,
    }));
  }

  private parseDate(dateStr: string | null): string | null {
    if (!dateStr) return null;

    try {
      // Handle various date formats
      const parts = dateStr.split(/[\/\-]/);
      if (parts.length === 3) {
        let day = parseInt(parts[0]);
        let month = parseInt(parts[1]);
        let year = parseInt(parts[2]);

        // Handle 2-digit year
        if (year < 100) {
          year += year > 50 ? 1900 : 2000;
        }

        // Validate
        if (day > 0 && day <= 31 && month > 0 && month <= 12 && year > 1990) {
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    } catch {
      // Return null on parse failure
    }

    return null;
  }

  private normalizeCounty(county: string): string {
    const c = county.toLowerCase();
    if (c.includes('city')) return 'Dublin City';
    if (c.includes('south')) return 'South Dublin';
    if (c.includes('fingal')) return 'Fingal';
    if (c.includes('laoghaire') || c.includes('rathdown')) return 'Dun Laoghaire-Rathdown';
    return 'Dublin';
  }

  async navigateToNextPage(): Promise<boolean> {
    if (!this.page) return false;

    try {
      const nextBtn = await this.page.$(
        'a:has-text("Next"), button:has-text("Next"), .pagination-next, a[rel="next"]'
      );
      if (nextBtn) {
        await nextBtn.click();
        await this.page.waitForLoadState('networkidle');
        await delay(2000);
        return true;
      }
    } catch {
      // No next page
    }

    return false;
  }

  async geocodeDecisions(decisions: ABPDecision[]): Promise<ABPDecision[]> {
    console.log(`\n🗺️  Geocoding ${decisions.length} decisions...`);

    for (const decision of decisions) {
      if (decision.latitude && decision.longitude) continue;

      try {
        // Try geocoding the location
        const geo = await geocodeAddress(decision.location || decision.address);
        if (geo) {
          decision.latitude = geo.latitude;
          decision.longitude = geo.longitude;
          console.log(`  ✓ ${decision.case_ref}: geocoded`);
        }
      } catch {
        console.log(`  ✗ ${decision.case_ref}: geocode failed`);
      }

      // Rate limiting
      await delay(300);
    }

    return decisions;
  }

  async saveDecisions(decisions: ABPDecision[]): Promise<{
    inserted: number;
    updated: number;
    failed: number;
  }> {
    if (decisions.length === 0) {
      return { inserted: 0, updated: 0, failed: 0 };
    }

    console.log(`\n📤 Saving ${decisions.length} ABP decisions to Supabase...`);

    let inserted = 0;
    let failed = 0;

    const batchSize = 50;
    for (let i = 0; i < decisions.length; i += batchSize) {
      const batch = decisions.slice(i, i + batchSize);

      const { error } = await this.supabase
        .from('abp_decisions')
        .upsert(batch, {
          onConflict: 'case_ref',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`❌ Batch failed:`, error.message);
        failed += batch.length;
      } else {
        inserted += batch.length;
        console.log(
          `  ✓ Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(decisions.length / batchSize)} saved`
        );
      }
    }

    console.log(`✅ Saved: ${inserted} processed, ${failed} failed`);

    return { inserted, updated: 0, failed };
  }

  async run(maxPages?: number): Promise<ABPDecision[]> {
    await this.initialize();

    if (!this.page) {
      throw new Error('Failed to initialize browser');
    }

    const pagesToScrape = maxPages || CONFIG.maxPages;
    const allDecisions: ABPDecision[] = [];
    const seenRefs = new Set<string>();

    await this.searchDublinCases();

    for (let pageNum = 1; pageNum <= pagesToScrape; pageNum++) {
      console.log(`\n=== Page ${pageNum}/${pagesToScrape} ===`);

      const decisions = await this.extractCasesFromPage();
      console.log(`Found ${decisions.length} cases on page`);

      // Deduplicate
      for (const decision of decisions) {
        if (!seenRefs.has(decision.case_ref)) {
          seenRefs.add(decision.case_ref);
          allDecisions.push(decision);
        }
      }

      // Try to navigate to next page
      const hasNext = await this.navigateToNextPage();
      if (!hasNext) {
        console.log('No more pages available');
        break;
      }

      await delay(CONFIG.delayMs);
    }

    // Geocode decisions
    await this.geocodeDecisions(allDecisions);

    await this.cleanup();
    return allDecisions;
  }

  async cleanup(): Promise<void> {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    console.log('✓ Browser cleanup complete');
  }
}

async function runPipeline(): Promise<void> {
  console.log('=== An Bord Pleanala Decisions Pipeline ===\n');
  console.log(`Target: ${CONFIG.baseUrl}\n`);

  const args = process.argv.slice(2);
  const maxPagesArg = args.find((a) => a.startsWith('--pages'));
  const maxPages = maxPagesArg
    ? parseInt(args[args.indexOf(maxPagesArg) + 1])
    : CONFIG.maxPages;

  const scraper = new ABPScraper();

  try {
    const decisions = await scraper.run(maxPages);

    if (decisions.length > 0) {
      await scraper.saveDecisions(decisions);
    }

    const withCoords = decisions.filter((d) => d.latitude && d.longitude).length;
    const geocodeRate =
      decisions.length > 0 ? Math.round((withCoords / decisions.length) * 100) : 0;

    console.log(`\n=== Pipeline Complete ===`);
    console.log(`Total decisions: ${decisions.length}`);
    console.log(`With coordinates: ${withCoords} (${geocodeRate}%)`);
    console.log(`Granted: ${decisions.filter((d) => d.decision === 'Granted').length}`);
    console.log(`Refused: ${decisions.filter((d) => d.decision === 'Refused').length}`);
    console.log(`Pending: ${decisions.filter((d) => d.decision === 'Pending').length}`);
  } catch (error) {
    console.error('Error during scraping:', error);
    await scraper.cleanup();
  }
}

console.log('Starting An Bord Pleanala scraper...');
runPipeline().catch(console.error);

export { ABPScraper };
