import { Metadata } from 'next';

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
  ],
  openGraph: {
    title: 'Dublin Property Prices by Area | Complete Guide 2025',
    description: 'Compare property prices across 300+ Dublin areas with comprehensive market data and trends.',
    type: 'website',
    url: 'https://gaffintel.com/areas',
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
  return children;
}

