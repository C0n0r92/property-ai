import { MetadataRoute } from 'next';
import { getAllAreaSlugs } from '@/lib/areas';

// Blog article slugs
const blogArticleSlugs = [
  'properties-over-asking-dublin',
  'dublin-rental-yield-analysis',
  'dublin-price-per-square-meter',
  'fastest-growing-areas-dublin',
  'planning-permission-activity',
  'property-types-analysis',
  'bedroom-count-analysis',
  'amenities-impact-prices',
  'complete-area-rankings',
  'remote-work-property-shift',
  'ai-property-predictions',
  'millennial-wealth-shift',
  'interest-rates-property-boom',
  'modular-housing-solution',
  'crypto-wealth-dublin',
  'ai-first-time-buyers',
  'detached-houses-dominance',
  'dublin-postcode-power-rankings',
  'bedroom-count-property-values',
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

