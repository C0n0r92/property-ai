import type { Metadata } from "next";
import dynamic from 'next/dynamic';

// Dynamic import for the client component
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-slate-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Loading interactive map...</p>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  title: "Dublin Property Map | Interactive Property Search & Price Data",
  description: "Explore Dublin's property market with our interactive map. View 43,000+ sold properties, current listings, and rental data. Get accurate price insights and market intelligence.",
  keywords: [
    'Dublin property map', 'interactive property map', 'Dublin house prices map',
    'property search Dublin', 'sold property map Dublin', 'Dublin real estate map',
    'property price map Ireland', 'Dublin property search tool', 'property map Dublin',
    'Dublin property listings map', 'sold prices map Dublin'
  ],
  openGraph: {
    type: 'website',
    locale: 'en_IE',
    url: 'https://irishpropertydata.com/map',
    siteName: 'Irish Property Data',
    title: 'Dublin Property Map | Interactive Property Search & Price Data',
    description: 'Explore Dublin\'s property market with our interactive map. View 43,000+ sold properties, current listings, and rental data.',
    images: [
      {
        url: '/map/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Dublin Property Map - Interactive Property Search & Price Data',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dublin Property Map | Interactive Property Search & Price Data',
    description: 'Explore Dublin\'s property market with our interactive map. View 43,000+ sold properties, current listings, and rental data.',
    images: ['/map/opengraph-image'],
  },
  alternates: {
    canonical: '/map',
  },
};

export default function MapPage() {
  return <MapComponent />;
}
