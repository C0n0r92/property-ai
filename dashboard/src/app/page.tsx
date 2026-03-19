import type { Metadata } from 'next';
import Script from 'next/script';
import HomepageClient from './HomepageClient';
import { loadProperties, getAreaStats } from '@/lib/data';
import { areaToSlug } from '@/lib/areas';

export const metadata: Metadata = {
  title: 'Irish Property Data | 44,000+ Dublin Property Sales & Prices',
  description: 'Search 44,000+ real Dublin property transactions. See actual sold prices, area trends, price per sqm, and market intelligence for every Dublin neighbourhood. Free.',
  keywords: [
    'Dublin property prices',
    'Dublin house prices',
    'Dublin sold prices',
    'Irish property data',
    'Dublin property search',
    'property prices Ireland',
    'Dublin property market',
    'Dublin property map',
    'Dublin area prices',
  ],
  openGraph: {
    title: 'Irish Property Data | 44,000+ Dublin Property Sales & Prices',
    description: 'Search 44,000+ real Dublin property transactions. See actual sold prices, area trends, price per sqm, and market intelligence for every Dublin neighbourhood.',
    type: 'website',
    url: 'https://irishpropertydata.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Irish Property Data | 44,000+ Dublin Property Sales & Prices',
    description: 'Search 44,000+ real Dublin property transactions. Actual sold prices, area trends & market intelligence.',
  },
  alternates: {
    canonical: '/',
  },
};

// Helper to determine county from area name
function getCountyFromArea(areaName: string): string {
  // Dublin districts
  if (areaName.match(/^Dublin\s+\d/i) || areaName.match(/\bDublin\s+\d/i)) {
    const district = parseInt(areaName.match(/\d+/)?.[0] || '0');
    if ([1, 2, 4, 6, 8].includes(district)) return 'South Dublin';
    if ([3, 5, 7, 9, 11, 13, 15, 17].includes(district)) return 'North Dublin';
    return 'Dublin';
  }
  // Named areas
  if (['Lucan', 'Clondalkin', 'Tallaght'].includes(areaName)) return 'West Dublin';
  if (['Swords', 'Malahide', 'Balbriggan'].includes(areaName)) return 'North County Dublin';
  if (['Ranelagh', 'Ballsbridge', 'Rathgar'].includes(areaName)) return 'South Dublin';
  return 'Dublin';
}

export default async function Home() {
  // Load properties and calculate area stats
  const properties = await loadProperties();
  const areaStats = getAreaStats(properties);

  // Get top 3 areas by sales volume
  const topAreas = areaStats.slice(0, 3).map(area => ({
    name: area.name,
    slug: areaToSlug(area.name),
    medianPrice: area.medianPrice,
    change6m: area.change6m,
    overAskingPct: Math.round(area.avgOverUnderPercent),
    salesCount: area.count,
    county: getCountyFromArea(area.name),
  }));

  return (
    <>
      <Script
        id="homepage-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebSite",
                "name": "Irish Property Data",
                "url": "https://irishpropertydata.com",
                "description": "Search 44,000+ real Dublin property transactions with actual sold prices, area trends, and market intelligence.",
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": "https://irishpropertydata.com/map?search={search_term_string}",
                  "query-input": "required name=search_term_string"
                }
              },
              {
                "@type": "Organization",
                "name": "Irish Property Data",
                "url": "https://irishpropertydata.com",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://irishpropertydata.com/opengraph-image"
                },
                "sameAs": []
              }
            ]
          })
        }}
      />
      <HomepageClient topAreas={topAreas} totalProperties={properties.length} />
    </>
  );
}
