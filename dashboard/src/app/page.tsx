import type { Metadata } from 'next';
import Script from 'next/script';
import HomepageClient from './HomepageClient';

export const metadata: Metadata = {
  title: 'Irish Property Data | 47,000+ Dublin Property Sales & Prices',
  description: 'Search 47,000+ real Dublin property transactions. See actual sold prices, area trends, price per sqm, and market intelligence for every Dublin neighbourhood. Free.',
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
    title: 'Irish Property Data | 47,000+ Dublin Property Sales & Prices',
    description: 'Search 47,000+ real Dublin property transactions. See actual sold prices, area trends, price per sqm, and market intelligence for every Dublin neighbourhood.',
    type: 'website',
    url: 'https://irishpropertydata.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Irish Property Data | 47,000+ Dublin Property Sales & Prices',
    description: 'Search 47,000+ real Dublin property transactions. Actual sold prices, area trends & market intelligence.',
  },
  alternates: {
    canonical: '/',
  },
};

export default function Home() {
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
                "description": "Search 47,000+ real Dublin property transactions with actual sold prices, area trends, and market intelligence.",
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
      <HomepageClient />
    </>
  );
}
