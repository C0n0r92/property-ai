import { Metadata } from 'next';
import { loadProperties, getAreaStats } from '@/lib/data';
import AreasIndexClient from './AreasIndexClient';

export const metadata: Metadata = {
  title: 'Dublin Property Prices by Area | Compare 300+ Neighbourhoods | Irish Property Data',
  description: 'Compare Dublin property prices across 300+ areas. View median prices, price per sqm, over-asking rates, and 6-month trends for every Dublin neighbourhood. Data from 44,000+ sales.',
  keywords: [
    'Dublin property prices by area',
    'Dublin neighbourhood prices',
    'Dublin area property prices',
    'Dublin postcode prices',
    'property prices Dublin areas',
    'Dublin property market areas',
    'compare Dublin areas',
    'Dublin house prices by area',
  ],
  openGraph: {
    title: 'Dublin Property Prices by Area | Compare 300+ Neighbourhoods',
    description: 'Compare property prices across 300+ Dublin areas. View median prices, over-asking rates, and market trends for every neighbourhood.',
    type: 'website',
    url: 'https://irishpropertydata.com/areas',
    images: [{
      url: '/opengraph-image',
      width: 1200,
      height: 630,
      alt: 'Dublin Property Prices by Area | Irish Property Data'
    }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dublin Property Prices by Area | Compare 300+ Neighbourhoods',
    description: 'Compare property prices across 300+ Dublin areas with real market data.',
  },
  alternates: {
    canonical: '/areas',
  },
};

export default async function AreasPage() {
  // Load properties server-side
  const properties = await loadProperties();
  const areaStats = getAreaStats(properties);

  // Serialize for client component
  const serializedStats = areaStats.map(area => ({
    name: area.name,
    count: area.count,
    medianPrice: area.medianPrice,
    avgPricePerSqm: area.avgPricePerSqm,
    pctOverAsking: area.pctOverAsking,
    avgOverUnderPercent: area.avgOverUnderPercent,
    avgOverUnderEuro: area.avgOverUnderEuro,
    change6m: area.change6m,
  }));

  return (
    <>
      {/* JSON-LD Structured Data for Areas Index */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": "Dublin Property Prices by Area",
            "description": "Compare property prices across 300+ Dublin areas with median prices, over-asking rates, and market trends.",
            "url": "https://irishpropertydata.com/areas",
            "mainEntity": {
              "@type": "ItemList",
              "numberOfItems": serializedStats.length,
              "itemListElement": serializedStats.slice(0, 10).map((area, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "name": area.name,
                "url": `https://irishpropertydata.com/areas/${area.name.toLowerCase().replace(/\s+/g, '-')}`
              }))
            },
            "breadcrumb": {
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Home",
                  "item": "https://irishpropertydata.com"
                },
                {
                  "@type": "ListItem",
                  "position": 2,
                  "name": "Areas",
                  "item": "https://irishpropertydata.com/areas"
                }
              ]
            }
          })
        }}
      />
      <AreasIndexClient areaStats={serializedStats} />
    </>
  );
}
