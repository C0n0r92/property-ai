import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Market Research & Intelligence | Irish Property Data',
  description: 'Professional market analysis and data-driven insights for Dublin\'s property landscape. Access comprehensive research on property trends, investment opportunities, and market analysis.',
  keywords: ['Dublin property market', 'market research', 'property analysis', 'investment research', 'real estate insights', 'Dublin property trends'],
  openGraph: {
    title: 'Market Research & Intelligence | Irish Property Data',
    description: 'Professional market analysis and data-driven insights for Dublin\'s property landscape.',
    type: 'website',
    url: 'https://irishpropertydata.com/blog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Market Research & Intelligence | Irish Property Data',
    description: 'Professional market analysis and data-driven insights for Dublin\'s property landscape.',
  },
  alternates: {
    canonical: '/blog',
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}