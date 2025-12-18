import { Metadata } from 'next';
import { slugToArea, getAllAreaSlugs } from '@/lib/areas';

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

  return {
    title: `Property Prices in ${areaName} | Irish Property Data`,
    description: `View sold property prices, market trends and €/m² data for ${areaName}. Based on comprehensive Dublin property market analysis.`,
    keywords: [
      `${areaName} house prices`,
      `${areaName} property prices`,
      `${areaName} property market`,
      `${areaName} sold prices`,
      `property prices ${areaName} 2025`,
      `${areaName} real estate`,
    ],
    openGraph: {
      title: `Property Prices in ${areaName} | Irish Property Data`,
      description: `View sold property prices, market trends and €/m² data for ${areaName}. Based on comprehensive Dublin property market analysis.`,
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
