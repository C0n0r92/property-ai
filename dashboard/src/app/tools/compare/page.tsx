import { Metadata } from 'next';
import ComparePageClient from './ComparePageClient';

export const metadata: Metadata = {
  title: 'Property Comparison Tool | Compare Dublin Properties Side-by-Side | Irish Property Data',
  description: 'Compare up to 5 Dublin properties side-by-side. View price analysis, mortgage estimates, walkability scores, planning data, and investment metrics in one comprehensive comparison.',
  keywords: [
    'property comparison tool',
    'compare Dublin properties',
    'Dublin property comparison',
    'compare house prices Dublin',
    'property side by side comparison',
    'Dublin real estate comparison',
  ],
  openGraph: {
    title: 'Property Comparison Tool | Compare Dublin Properties Side-by-Side',
    description: 'Compare up to 5 Dublin properties with price analysis, mortgage estimates, and market intelligence.',
    type: 'website',
    url: 'https://irishpropertydata.com/tools/compare',
  },
  twitter: {
    card: 'summary',
    title: 'Property Comparison Tool | Irish Property Data',
    description: 'Compare Dublin properties side-by-side with comprehensive market data.',
  },
  alternates: {
    canonical: '/tools/compare',
  },
};

export default function ComparePage() {
  return <ComparePageClient />;
}
