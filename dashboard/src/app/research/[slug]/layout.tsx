import { Metadata } from 'next';

// Article metadata for SEO (subset of the full articles data in page.tsx)
const articleMeta: Record<string, { title: string; excerpt: string; tags: string[]; date: string }> = {
  'dublin-property-market-q4-2024': {
    title: 'Dublin Property Market Analysis Q4 2024',
    excerpt: 'Comprehensive analysis of Dublin\'s property market performance, price trends, and future outlook based on 43,000+ transactions.',
    tags: ['Market Trends', 'Price Analysis', 'Q4 2024'],
    date: '2024-12-22',
  },
  'dublin-rental-yield-analysis': {
    title: 'Dublin Rental Yield Analysis: Best Areas for Property Investment',
    excerpt: 'Comprehensive analysis of rental yields across Dublin areas with investment potential and risk assessment.',
    tags: ['Rental Yield', 'Investment', 'Buy-to-Let'],
    date: '2024-12-22',
  },
  'dublin-price-per-square-meter': {
    title: 'Dublin Property Price Per Square Meter: Comprehensive Area Comparison',
    excerpt: 'Detailed analysis of price per square meter across all Dublin areas with value insights and market segmentation.',
    tags: ['Price per m²', 'Value Analysis', 'Market Comparison'],
    date: '2024-12-22',
  },
  'fastest-growing-areas-dublin': {
    title: 'Dublin Areas with Fastest Property Price Growth: 6-Month Analysis',
    excerpt: 'Analysis of Dublin\'s fastest growing property markets with momentum indicators and emerging opportunities.',
    tags: ['Price Growth', 'Market Momentum', 'Investment Opportunities'],
    date: '2024-12-22',
  },
  'planning-permission-activity': {
    title: 'Planning Permission Activity and Future Property Supply in Dublin',
    excerpt: 'Analysis of development applications and future property supply across Dublin\'s planning pipeline.',
    tags: ['Planning Permission', 'Future Supply', 'Development'],
    date: '2024-12-22',
  },
  'property-types-analysis': {
    title: 'Dublin Property Types Analysis: Apartments vs Houses Market Dynamics',
    excerpt: 'Comparative analysis of apartments versus houses in Dublin with price trends and market preferences.',
    tags: ['Property Types', 'Apartments', 'Houses'],
    date: '2024-12-22',
  },
  'bedroom-count-analysis': {
    title: 'Bedroom Count vs Property Prices: Dublin Market Breakdown',
    excerpt: 'Analysis of how bedroom count affects property prices across Dublin with cost per bedroom insights.',
    tags: ['Bedrooms', 'Price Analysis', 'Property Size'],
    date: '2024-12-22',
  },
  'amenities-impact-prices': {
    title: 'Dublin Property Amenities Impact Analysis: Schools, Transport, and Value',
    excerpt: 'Quantitative analysis of how proximity to amenities affects Dublin property prices and values.',
    tags: ['Amenities', 'Schools', 'Transport'],
    date: '2024-12-22',
  },
  'complete-area-rankings': {
    title: 'Complete Guide to Dublin Property Areas: Price, Yield, and Growth Rankings',
    excerpt: 'Comprehensive rankings of all Dublin areas across multiple factors for informed property decisions.',
    tags: ['Area Rankings', 'Comprehensive Guide', 'Decision Framework'],
    date: '2024-12-22',
  },
  'properties-over-asking-dublin': {
    title: 'Where Dublin Properties Go Most Over Asking Price in 2024',
    excerpt: 'Detailed breakdown of Dublin areas where properties consistently sell above asking price, with market demand indicators.',
    tags: ['Over Asking', 'Market Demand', 'Buyer Competition'],
    date: '2024-12-22',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = articleMeta[slug];

  if (!article) {
    return {
      title: 'Research Article | Irish Property Data',
    };
  }

  const canonicalUrl = `/research/${slug}`;

  return {
    title: `${article.title} | Irish Property Data`,
    description: article.excerpt,
    keywords: [...article.tags, 'Dublin property', 'Irish property market', 'property research'],
    openGraph: {
      title: article.title,
      description: article.excerpt,
      url: `https://irishpropertydata.com${canonicalUrl}`,
      siteName: 'Irish Property Data',
      type: 'article',
      publishedTime: article.date,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt,
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default function ResearchArticleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
