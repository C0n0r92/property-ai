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
  
  const title = `${areaName} House Prices 2025 | Complete Market Data & Analysis`;
  const description = `Explore ${areaName} property prices, market trends, and sales data. See median prices, recent sales, price trends, and comprehensive statistics for ${areaName} properties.`;
  
  return {
    title,
    description,
    keywords: [
      `${areaName} house prices`,
      `${areaName} property prices`,
      `${areaName} property market`,
      `${areaName} sold prices`,
      `average house price ${areaName}`,
      `property prices ${areaName} 2025`,
      `${areaName} real estate`,
    ],
    openGraph: {
      title,
      description,
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
