import { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Dublin Property Prices by Area | Complete Guide 2025',
  description: 'Explore property prices across 300+ Dublin areas. Compare median prices, market trends, and sales data for every Dublin neighborhood with detailed analytics.',
  keywords: [
    'Dublin property prices by area',
    'Dublin house prices by district',
    'Dublin property market',
    'Dublin area property prices',
    'where to buy Dublin',
    'Dublin property comparison',
    'compare Dublin areas',
    'best areas Dublin property',
    'Dublin areas ranked by price',
    'Dublin property market analysis',
    'Dublin neighborhood prices',
    'Dublin suburb property values',
    'Dublin postcode property prices',
    'Dublin area market trends',
    'Dublin property price comparison',
    'Dublin area investment guide',
  ],
  openGraph: {
    title: 'Dublin Property Prices by Area | Complete Guide 2025',
    description: 'Compare property prices across 300+ Dublin areas with comprehensive market data and trends.',
    type: 'website',
    url: 'https://irishpropertydata.com/areas',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dublin Property Prices by Area',
    description: 'Explore and compare property prices across all Dublin areas',
  },
  alternates: {
    canonical: '/areas',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AreasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": "Dublin Property Prices by Area",
            "description": "Explore comprehensive property market data for 300+ Dublin areas with prices, trends, and market analysis",
            "url": "https://irishpropertydata.com/areas",
            "publisher": {
              "@type": "Organization",
              "name": "Irish Property Data",
              "url": "https://irishpropertydata.com",
              "logo": {
                "@type": "ImageObject",
                "url": "https://irishpropertydata.com/opengraph-image"
              }
            },
            "about": {
              "@type": "Place",
              "name": "Dublin",
              "addressCountry": "IE"
            },
            "mainEntity": {
              "@type": "ItemList",
              "name": "Dublin Property Areas",
              "description": "Comprehensive list of Dublin property areas with market data",
              "numberOfItems": "300+"
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
      {children}
    </>
  );
}

