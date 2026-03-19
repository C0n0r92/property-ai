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

      // Calculate over-asking rate
      const overAskingCount = areaProperties.filter(p => p.overUnderPercent && p.overUnderPercent > 0).length;
      const overAskingRate = Math.round((overAskingCount / areaProperties.length) * 100);

      titleWithStats = `${areaName}: Median ${formattedMedian} | ${areaProperties.length} Sales | Dublin Property Data`;
      descriptionWithStats = `${areaName} property prices: median ${formattedMedian} based on ${areaProperties.length} sales. See actual sold prices, over-asking rates (${overAskingRate}%), price per m² and 6-month trends. Updated daily.`;
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
      images: [{
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: `${areaName} Property Prices | Irish Property Data`
      }]
    },
    alternates: {
      canonical: `/areas/${slug}`,
    },
  };
}

export default async function AreaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const areaName = slugToArea(slug);

  if (!areaName) {
    return children;
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
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
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": areaName,
        "item": `https://irishpropertydata.com/areas/${slug}`
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
