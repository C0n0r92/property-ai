import { Metadata } from 'next';
import ResearchPageClient from './ResearchPageClient';

export const metadata: Metadata = {
  title: 'Dublin Property Market Research & Intelligence | Irish Property Data',
  description: 'Professional Dublin property market research and analysis. Data-driven insights on price trends, rental yields, investment opportunities, and area performance. Based on 43,000+ transactions.',
  keywords: [
    'Dublin property research',
    'Dublin market analysis',
    'Dublin property investment research',
    'Dublin real estate analysis',
    'Dublin property market reports',
    'Dublin property data insights',
    'Dublin area analysis',
  ],
  openGraph: {
    title: 'Dublin Property Market Research & Intelligence',
    description: 'Professional market analysis and data-driven insights for Dublin property buyers, sellers, and investors.',
    type: 'website',
    url: 'https://irishpropertydata.com/research',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dublin Property Market Research | Irish Property Data',
    description: 'Data-driven Dublin property market research based on 43,000+ transactions.',
  },
  alternates: {
    canonical: '/research',
  },
};

export default function ResearchPage() {
  return (
    <>
      {/* JSON-LD for Research Index */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": "Dublin Property Market Research",
            "description": "Professional market analysis and data-driven insights for Dublin property",
            "url": "https://irishpropertydata.com/research",
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
                  "name": "Research",
                  "item": "https://irishpropertydata.com/research"
                }
              ]
            }
          })
        }}
      />
      <ResearchPageClient />
    </>
  );
}
