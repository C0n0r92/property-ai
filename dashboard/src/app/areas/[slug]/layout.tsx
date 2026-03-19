import { Metadata } from 'next';
import { slugToArea, getAllAreaSlugs, addressMatchesArea } from '@/lib/areas';
import { loadProperties } from '@/lib/data';

export async function generateStaticParams() {
  const slugs = getAllAreaSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const areaName = slugToArea(slug);

  if (!areaName) {
    return {
      title: 'Area Not Found | Irish Property Data',
    };
  }

  // Load properties to get real stats for the title
  let titleWithStats = `${areaName} Property Prices & Market Data | Irish Property Data`;
  let descriptionWithStats = `View sold property prices, market trends and €/m² data for ${areaName}. Based on comprehensive Dublin property market analysis.`;

  try {
    const allProperties = await loadProperties();
    const areaProperties = allProperties.filter(p =>
      addressMatchesArea(p.address, areaName)
    );

    if (areaProperties.length > 0) {
      const prices = areaProperties.map(p => p.soldPrice).filter(p => p >= 50000).sort((a, b) => a - b);
      const medianPrice = prices[Math.floor(prices.length / 2)];
      const formattedMedian = medianPrice >= 1000000
        ? `€${(medianPrice / 1000000).toFixed(1)}M`
        : `€${Math.round(medianPrice / 1000)}K`;

      titleWithStats = `${areaName}: Median ${formattedMedian} | ${areaProperties.length} Sales | Dublin Property Data`;
      descriptionWithStats = `${areaName} property prices: median ${formattedMedian} from ${areaProperties.length} sales. See actual sold prices, price trends, €/m² data, and market analysis.`;
    }
  } catch {
    // Fall back to generic title if data loading fails
  }

  return {
    title: titleWithStats,
    description: descriptionWithStats,
    keywords: [
      `${areaName} house prices`,
      `${areaName} property prices`,
      `${areaName} property market`,
      `${areaName} sold prices`,
      `property prices ${areaName} 2025`,
      `${areaName} real estate`,
    ],
    openGraph: {
      title: titleWithStats,
      description: descriptionWithStats,
      type: 'website',
    },
    alternates: {
      canonical: `/areas/${slug}`,
    },
  };
}

export default function AreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
