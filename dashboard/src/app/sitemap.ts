import { MetadataRoute } from 'next';
import { getAllAreaSlugs } from '@/lib/areas';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://irishpropertydata.com';
  
  // Get all area slugs for dynamic area pages
  const areaSlugs = getAllAreaSlugs();
  
  // Create sitemap entries for all area pages
  const areaPages: MetadataRoute.Sitemap = areaSlugs.map(slug => ({
    url: `${baseUrl}/areas/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
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
      priority: 1,
    },
    {
      url: `${baseUrl}/areas`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/insights`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    // Add all area pages
    ...areaPages,
  ];
}

