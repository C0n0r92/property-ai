/**
 * Planning Applications Pipeline
 *
 * Scrapes planning register data from Dublin council ArcGIS endpoints.
 * Covers: South Dublin, Fingal, DCC, Dun Laoghaire-Rathdown.
 *
 * Data sources:
 * - South Dublin: https://data-sdublincoco.opendata.arcgis.com/datasets/planning-register
 * - Fingal: https://data-fingalcoco.opendata.arcgis.com/datasets/planning-applications
 * - DCC: https://data.dublincity.ie/dataset/planning-applications
 * - DLRCC: https://data-dlrcoco.opendata.arcgis.com/datasets/planning-applications
 *
 * Usage:
 * - npm run scrape:planning           # Scrape all councils
 * - npm run scrape:planning -- --council south_dublin  # Specific council
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

// Types
interface PlanningApplication {
  application_ref: string;
  source: string;
  address: string;
  description: string;
  application_type: string;
  development_type: string;
  decision: string;
  decision_date: string | null;
  received_date: string | null;
  applicant_name: string;
  units_proposed: number | null;
  floor_area_sqm: number | null;
  latitude: number | null;
  longitude: number | null;
}

interface ArcGISResponse {
  features: Array<{
    attributes: Record<string, any>;
    geometry?: {
      x: number;
      y: number;
    };
  }>;
  exceededTransferLimit?: boolean;
}

// ArcGIS endpoint configurations
const ARCGIS_ENDPOINTS = {
  south_dublin: {
    url: 'https://services-eu1.arcgis.com/KKOCaOSvJP0CYJrc/arcgis/rest/services/Planning_Applications/FeatureServer/0/query',
    fields: {
      ref: 'ApplicationNumber',
      address: 'LocationOfDevelopment',
      description: 'ProposedDevelopment',
      type: 'ApplicationType',
      decision: 'Decision',
      decisionDate: 'DecisionDate',
      receivedDate: 'ReceivedDate',
      applicant: 'ApplicantName',
    },
  },
  fingal: {
    url: 'https://services1.arcgis.com/bqfNVPUK3HOnCFmA/arcgis/rest/services/Planning_Applications/FeatureServer/0/query',
    fields: {
      ref: 'FILE_NUMBER',
      address: 'LOCATION',
      description: 'DEVELOPMENT',
      type: 'APP_TYPE',
      decision: 'DECISION',
      decisionDate: 'DECISION_DATE',
      receivedDate: 'RECD_DATE',
      applicant: 'APPLICANT',
    },
  },
  dun_laoghaire: {
    url: 'https://services1.arcgis.com/bqfNVPUK3HOnCFmA/arcgis/rest/services/Planning_Applications_DLRCC/FeatureServer/0/query',
    fields: {
      ref: 'PLANNING_REF',
      address: 'SITE_ADDRESS',
      description: 'PROPOSAL',
      type: 'APPLICATION_TYPE',
      decision: 'DECISION',
      decisionDate: 'DECISION_DATE',
      receivedDate: 'LODGEMENT_DATE',
      applicant: 'APPLICANT_NAME',
    },
  },
  dcc: {
    url: 'https://services-eu1.arcgis.com/KKOCaOSvJP0CYJrc/arcgis/rest/services/PlanningApplications/FeatureServer/0/query',
    fields: {
      ref: 'PLANAPPNUM',
      address: 'ADDRESS',
      description: 'DESCRIPTION',
      type: 'APPTYPE',
      decision: 'DECISION',
      decisionDate: 'DECISIONDATE',
      receivedDate: 'LODGEDATE',
      applicant: 'APPLICANT',
    },
  },
};

// Configuration
const CONFIG = {
  batchSize: 1000,
  delayBetweenRequests: 500,
  maxRetries: 3,
  lookbackDays: 365 * 2, // 2 years of data
};

class PlanningPipeline {
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

  /**
   * Fetch planning applications from ArcGIS endpoint
   */
  private async fetchFromArcGIS(
    council: keyof typeof ARCGIS_ENDPOINTS,
    offset: number = 0
  ): Promise<ArcGISResponse> {
    const endpoint = ARCGIS_ENDPOINTS[council];

    // Calculate date filter (last N days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CONFIG.lookbackDays);
    const dateFilter = `${endpoint.fields.receivedDate} >= DATE '${cutoffDate.toISOString().split('T')[0]}'`;

    const params = new URLSearchParams({
      where: dateFilter,
      outFields: '*',
      returnGeometry: 'true',
      outSR: '4326', // WGS84 coordinates
      f: 'json',
      resultOffset: offset.toString(),
      resultRecordCount: CONFIG.batchSize.toString(),
    });

    const url = `${endpoint.url}?${params.toString()}`;

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return (await response.json()) as ArcGISResponse;
      } catch (error: any) {
        lastError = error;
        console.warn(
          `⚠️ Attempt ${attempt}/${CONFIG.maxRetries} failed for ${council}: ${error.message}`
        );
        if (attempt < CONFIG.maxRetries) {
          await this.delay(CONFIG.delayBetweenRequests * attempt);
        }
      }
    }

    throw lastError || new Error(`Failed to fetch from ${council}`);
  }

  /**
   * Transform ArcGIS feature to planning application
   */
  private transformFeature(
    feature: ArcGISResponse['features'][0],
    council: keyof typeof ARCGIS_ENDPOINTS
  ): PlanningApplication | null {
    const fields = ARCGIS_ENDPOINTS[council].fields;
    const attrs = feature.attributes;

    const ref = attrs[fields.ref];
    if (!ref) return null;

    // Parse dates (ArcGIS returns milliseconds since epoch)
    const parseDate = (val: any): string | null => {
      if (!val) return null;
      if (typeof val === 'number') {
        return new Date(val).toISOString().split('T')[0];
      }
      if (typeof val === 'string') {
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
      }
      return null;
    };

    // Extract residential units from description
    const extractUnits = (desc: string): number | null => {
      if (!desc) return null;
      const matches = desc.match(/(\d+)\s*(dwelling|residential|house|apartment|unit)/i);
      return matches ? parseInt(matches[1]) : null;
    };

    // Determine development type
    const getDevelopmentType = (desc: string, type: string): string => {
      if (!desc && !type) return 'Unknown';
      const combined = `${desc || ''} ${type || ''}`.toLowerCase();
      if (combined.includes('residential') || combined.includes('dwelling') || combined.includes('house')) {
        return 'Residential';
      }
      if (combined.includes('commercial') || combined.includes('retail') || combined.includes('office')) {
        return 'Commercial';
      }
      if (combined.includes('mixed')) {
        return 'Mixed Use';
      }
      if (combined.includes('industrial') || combined.includes('warehouse')) {
        return 'Industrial';
      }
      return 'Other';
    };

    const description = attrs[fields.description] || '';
    const appType = attrs[fields.type] || '';

    return {
      application_ref: String(ref).trim(),
      source: council,
      address: attrs[fields.address] || '',
      description: description.substring(0, 2000), // Limit length
      application_type: appType,
      development_type: getDevelopmentType(description, appType),
      decision: this.normalizeDecision(attrs[fields.decision]),
      decision_date: parseDate(attrs[fields.decisionDate]),
      received_date: parseDate(attrs[fields.receivedDate]),
      applicant_name: attrs[fields.applicant] || '',
      units_proposed: extractUnits(description),
      floor_area_sqm: null, // Would need additional parsing
      latitude: feature.geometry?.y || null,
      longitude: feature.geometry?.x || null,
    };
  }

  /**
   * Normalize decision status
   */
  private normalizeDecision(decision: any): string {
    if (!decision) return 'Pending';
    const d = String(decision).toLowerCase().trim();
    if (d.includes('grant') || d.includes('approved')) return 'Granted';
    if (d.includes('refuse') || d.includes('reject')) return 'Refused';
    if (d.includes('withdraw')) return 'Withdrawn';
    if (d.includes('invalid')) return 'Invalid';
    if (d.includes('pending') || d === '') return 'Pending';
    return 'Other';
  }

  /**
   * Scrape all planning applications from a council
   */
  async scrapeCouncil(
    council: keyof typeof ARCGIS_ENDPOINTS
  ): Promise<PlanningApplication[]> {
    console.log(`\n📋 Scraping planning applications from ${council}...`);

    const applications: PlanningApplication[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      console.log(`  Fetching batch at offset ${offset}...`);

      const response = await this.fetchFromArcGIS(council, offset);

      if (!response.features || response.features.length === 0) {
        hasMore = false;
        break;
      }

      for (const feature of response.features) {
        const app = this.transformFeature(feature, council);
        if (app) {
          applications.push(app);
        }
      }

      console.log(
        `  ✓ Retrieved ${response.features.length} applications (total: ${applications.length})`
      );

      // Check if there are more results
      hasMore = response.exceededTransferLimit === true;
      offset += CONFIG.batchSize;

      // Rate limiting
      await this.delay(CONFIG.delayBetweenRequests);
    }

    console.log(`✅ ${council}: ${applications.length} applications retrieved`);
    return applications;
  }

  /**
   * Save applications to Supabase
   */
  async saveApplications(applications: PlanningApplication[]): Promise<{
    inserted: number;
    updated: number;
    failed: number;
  }> {
    if (applications.length === 0) {
      return { inserted: 0, updated: 0, failed: 0 };
    }

    console.log(`\n📤 Saving ${applications.length} applications to Supabase...`);

    let inserted = 0;
    let updated = 0;
    let failed = 0;

    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < applications.length; i += batchSize) {
      const batch = applications.slice(i, i + batchSize);

      // Transform to database format with geometry
      const records = batch.map((app) => ({
        application_ref: app.application_ref,
        source: app.source,
        address: app.address,
        description: app.description,
        application_type: app.application_type,
        development_type: app.development_type,
        decision: app.decision,
        decision_date: app.decision_date,
        received_date: app.received_date,
        applicant_name: app.applicant_name,
        units_proposed: app.units_proposed,
        floor_area_sqm: app.floor_area_sqm,
        latitude: app.latitude,
        longitude: app.longitude,
        // PostGIS geometry - using raw SQL would be better
        // geom: app.latitude && app.longitude ? `SRID=4326;POINT(${app.longitude} ${app.latitude})` : null,
      }));

      const { error } = await this.supabase
        .from('planning_applications')
        .upsert(records, {
          onConflict: 'application_ref,source',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`❌ Batch ${i / batchSize + 1} failed:`, error.message);
        failed += batch.length;
      } else {
        inserted += batch.length; // Can't distinguish insert vs update with upsert
        console.log(
          `  ✓ Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(applications.length / batchSize)} saved`
        );
      }
    }

    console.log(
      `✅ Saved: ${inserted} processed, ${failed} failed`
    );

    return { inserted, updated, failed };
  }

  /**
   * Update geometry column using PostGIS
   */
  async updateGeometries(): Promise<void> {
    console.log('\n🗺️  Updating PostGIS geometries...');

    const { error } = await this.supabase.rpc('update_planning_geometries');

    if (error) {
      // If RPC doesn't exist, try raw SQL approach
      console.warn(
        '⚠️ RPC not available, geometries may need manual update'
      );
    } else {
      console.log('✅ Geometries updated');
    }
  }

  /**
   * Run the full pipeline
   */
  async run(councils?: string[]): Promise<void> {
    const startTime = Date.now();
    console.log('=== Planning Applications Pipeline ===\n');
    console.log(`Started at: ${new Date().toISOString()}`);

    // Determine which councils to scrape
    const councilsToScrape = councils?.length
      ? councils.filter((c) => c in ARCGIS_ENDPOINTS)
      : (Object.keys(ARCGIS_ENDPOINTS) as Array<keyof typeof ARCGIS_ENDPOINTS>);

    if (councilsToScrape.length === 0) {
      console.error('❌ No valid councils specified');
      return;
    }

    console.log(`Councils: ${councilsToScrape.join(', ')}`);

    let totalApplications = 0;
    let totalSaved = 0;

    // Scrape each council
    for (const council of councilsToScrape) {
      try {
        const applications = await this.scrapeCouncil(
          council as keyof typeof ARCGIS_ENDPOINTS
        );
        totalApplications += applications.length;

        const result = await this.saveApplications(applications);
        totalSaved += result.inserted;
      } catch (error: any) {
        console.error(`❌ Failed to scrape ${council}:`, error.message);
      }
    }

    // Update geometries
    await this.updateGeometries();

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n=== Pipeline Complete ===`);
    console.log(`Total applications: ${totalApplications}`);
    console.log(`Saved to database: ${totalSaved}`);
    console.log(`Duration: ${duration}s`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Main entry point
async function main() {
  const args = process.argv.slice(2);
  const councilArg = args.find((a) => a.startsWith('--council'));
  const councils = councilArg
    ? [args[args.indexOf(councilArg) + 1]]
    : undefined;

  const pipeline = new PlanningPipeline();
  await pipeline.run(councils);
}

console.log('Starting planning applications scraper...');
main().catch(console.error);

export { PlanningPipeline };
