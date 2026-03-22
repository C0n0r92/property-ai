import { MetadataRoute } from 'next';
import { getAllAreaSlugs } from '@/lib/areas';
import { loadProperties } from '@/lib/data';

// Blog article slugs - all active blog posts
const blogArticleSlugs = [
  'dublin-spring-2026-market-outlook',
  '250k-350k-property-bracket-dublin',
  '3-bed-property-sweet-spot',
  '3bed-phenomenon',
  'affordable-hotspots-2025',
  'ai-first-time-buyers',
  'ai-property-predictions',
  'amenities-impact-prices',
  'asking-price-strategy-dublin',
  'asking_price_strategy',
  'bedroom-count-analysis',
  'bedroom-count-property-values',
  'biggest-price-improvements-6-months',
  'christmas-property-market-analysis',
  'commuter-calculation-dublin',
  'compare-properties-complete-guide',
  'complete-area-rankings',
  'crypto-wealth-dublin',
  'd15-area-analysis-growth-hotspot',
  'd2-area-deep-dive-analysis',
  'd4-premium',
  'd6w-area-deep-dive-analysis',
  'd7-area-deep-dive-analysis',
  'detached-houses-dominance',
  'dublin-4-area-analysis-contrarian-decline',
  'dublin-apartment-market-2025',
  'dublin-bidding-war-costs',
  'dublin-bidding-wars-analysis',
  'dublin-bidding-wars-strategy-analysis',
  'dublin-conservative-market-strategy',
  'dublin-corner-house-discount',
  'dublin-d3-area-analysis',
  'dublin-d5-area-analysis',
  'dublin-geographic-yield-analysis',
  'dublin-luxury-hotspots-2024',
  'dublin-market-2025-rebound',
  'dublin-market-quiet-zones',
  'dublin-over-asking-strategy-guide',
  'dublin-planning-permission-tool-guide',
  'dublin-postcode-power-rankings',
  'dublin-price-per-square-meter',
  'dublin-property-map-guide',
  'dublin-property-market-q4-2024',
  'dublin-property-prices-since-covid',
  'dublin-property-size-efficiency',
  'dublin-property-timing-value-tradeoff',
  'dublin-property-valuation-increases-2025',
  'dublin-rental-affordability-crisis',
  'dublin-rental-guide-2025',
  'dublin-rental-market-2025',
  'dublin-rental-market-hotspots',
  'dublin-rental-market-tenant-perspective',
  'dublin-rental-yield-analysis',
  'dublin-street-type-momentum',
  'dublin-suburban-over-asking-hotspots',
  'dublin-undervalued-gems-2024',
  'extensions-attic-conversions-property-value-2024',
  'fastest-growing-areas-dublin',
  'first-time-buyer-bracket-analysis',
  'geographic-price-intelligence',
  'interest-rates-property-boom',
  'investor-yield-curve',
  'january-2025-timing',
  'millennial-wealth-shift',
  'modular-housing-solution',
  'mortgage-overpayment-by-property-type',
  'mortgage-overpayment-savings-strategy',
  'over-asking-phenomenon-2024',
  'planning-permission-activity',
  'properties-over-asking-dublin',
  'property-size-premium-2025',
  'property-type-cyclical-performance',
  'property-types-analysis',
  'q2-vs-q1-selling-dublin',
  'q4-2024-vs-q1-2025-market-shift',
  'remote-work-property-shift',
  'rental-yields-buy-to-let-2025',
  'size-based-mortgage-strategy',
  'size-efficiency-paradox-analysis',
  'space-efficiency-paradox',
  'sustainability-premium-2025',
  'value-erosion-2021-2025',
];

// Fetch top 500 most recent sold properties for sitemap
async function getRecentPropertyUrls(): Promise<MetadataRoute.Sitemap> {
  try {
    const properties = await loadProperties();
    const recent = properties
      .filter(p => p.soldDate && p.id)
      .sort((a, b) => new Date(b.soldDate).getTime() - new Date(a.soldDate).getTime())
      .slice(0, 500);

    const baseUrl = 'https://irishpropertydata.com';
    return recent.map(p => ({
      // Use clean ID-based URLs (no URL-encoded addresses)
      url: `${baseUrl}/property/sold/${encodeURIComponent(p.id ?? p.address)}`,
      lastModified: new Date(p.soldDate),
      changeFrequency: 'never' as const,
      priority: 0.4,
    }));
  } catch (error) {
    console.error('Failed to load properties for sitemap:', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://irishpropertydata.com';

  // Get all area slugs for dynamic area pages
  const areaSlugs = getAllAreaSlugs();

  // Create sitemap entries for all area pages
  const areaPages: MetadataRoute.Sitemap = areaSlugs.map(slug => ({
    url: `${baseUrl}/areas/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Create sitemap entries for all blog pages
  const blogPages: MetadataRoute.Sitemap = blogArticleSlugs.map(slug => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // Get property pages
  const propertyPages = await getRecentPropertyUrls();

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/map`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/areas`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/insights`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/mortgage-calc`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/tools/compare`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/tools/planning`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/tools/amenities`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/planning`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    // Add all area pages
    ...areaPages,
    // Add all blog pages
    ...blogPages,
    // Add top 500 recent property pages
    ...propertyPages,
  ];
}

