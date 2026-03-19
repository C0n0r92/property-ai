import type { Metadata } from 'next';
import BlogIndexClient from './BlogIndexClient';
import { getArticleIndex, getAllSlugs } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Dublin Property Market Research & Analysis | Irish Property Data',
  description: 'Data-driven Dublin property market research covering price trends, area analysis, rental yields, and investment strategies. 58+ free articles based on 47,000+ real transactions.',
  keywords: [
    'Dublin property research',
    'Dublin property market analysis',
    'Dublin house price trends',
    'Dublin area analysis',
    'Dublin rental yield analysis',
    'property investment Dublin',
    'Dublin property data insights',
  ],
  openGraph: {
    title: 'Dublin Property Market Research & Analysis | Irish Property Data',
    description: 'Data-driven Dublin property market research covering price trends, area analysis, rental yields, and investment strategies.',
    type: 'website',
    url: 'https://irishpropertydata.com/blog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dublin Property Market Research & Analysis',
    description: 'Free data-driven property market research for Dublin buyers, sellers, and investors.',
  },
  alternates: {
    canonical: '/blog',
  },
};

export default function BlogPage() {
  // Load all articles from file system (includes slug in metadata)
  const articles = getArticleIndex();

  // Add id field as alias for slug for compatibility with BlogIndexClient
  const articlesWithId = articles.map(article => ({
    ...article,
    id: article.slug || '',
  }));

  return <BlogIndexClient articles={articlesWithId} />;
}
