import { MetadataRoute } from 'next';
import { getAllAreaSlugs } from '@/lib/areas';

// Blog article slugs - current active blog posts
const blogArticleSlugs = [
  'dublin-d3-area-analysis',
  'size-based-mortgage-strategy',
  'geographic-price-intelligence',
  'property-type-cyclical-performance',
  'size-efficiency-paradox-analysis',
  'compare-properties-complete-guide',
  'dublin-property-timing-value-tradeoff',
  'mortgage-overpayment-savings-strategy',
  'dublin-4-area-analysis-contrarian-decline',
  'dublin-property-valuation-increases-2025',
  'd6w-area-deep-dive-analysis',
  'd7-area-deep-dive-analysis',
  'd2-area-deep-dive-analysis',
  'dublin-property-market-q4-2024',
  'properties-over-asking-dublin',
  'dublin-rental-yield-analysis',
  'dublin-price-per-square-meter',
  'fastest-growing-areas-dublin',
  'biggest-price-improvements-6-months',
  'planning-permission-activity',
  'property-types-analysis',
  'bedroom-count-analysis',
  'amenities-impact-prices',
  'dublin-property-areas-complete-guide-rankings',
  'dublin-luxury-hotspots-2024',
  'over-asking-phenomenon-2024',
  'detached-houses-dominance',
  'dublin-postcode-power-rankings',
  'bedroom-count-property-values',
  'dublin-undervalued-gems-2024',
  'affordable-hotspots-2025',
  'property-size-premium-2025',
  'q4-2024-vs-q1-2025-market-shift',
  'rental-yields-buy-to-let-2025',
  'dublin-rental-guide-2025',
  'asking_price_strategy',
  '250k_350k_bracket',
  'apartment_market_2025',
  '3bed_sweet_spot',
  'commuter_calculation',
  'investor_yield_curve',
  '3bed_phenomenon',
  'd4_premium',
  'january_2025_timing',
  'dublin-rental-market-2025',
  'q2-vs-q1-selling-dublin',
  'dublin-rental-market-tenant-perspective',
  'space-efficiency-paradox',
  'value-erosion-2021-2025',
  'dublin-property-map-guide',
];

export default function sitemap(): MetadataRoute.Sitemap {
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
    // Add all area pages
    ...areaPages,
    // Add all blog pages
    ...blogPages,
  ];
}

