import { MetadataRoute } from 'next';
import { getAllAreaSlugs } from '@/lib/areas';

// Blog article slugs - dynamically get all actual blog files
const blogArticleSlugs = [
  'asking_price_strategy',
  '250k_350k_bracket',
  'apartment_market_2025',
  '3bed_sweet_spot',
  'commuter_calculation',
  'sellers_market_strategy',
  'space_efficiency_paradox',
  'investor_yield_curve',
  '3bed_phenomenon',
  'd4_premium',
  'january_timing',
  'rental_market',
  'q2_vs_q1_selling',
  'renter_market_insights',
  'value_erosion_2021_2025',
  'bidding_wars_dublin',
  'bidding_war_costs',
  'map_features_guide',
  'property_valuation_increases',
  'd6w_area_deep_dive',
  'd7_area_deep_dive',
  'd2_area_deep_dive',
  'd4_area_analysis',
  'mortgage_overpayment_savings',
  'timing_value_tradeoff',
  'compare_properties_guide',
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

