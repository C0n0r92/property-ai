import { getAllAreaSlugs, slugToArea } from '@/lib/areas';
import AreaClient from './AreaClient';
import { notFound } from 'next/navigation';

// Generate static params for all area pages
export async function generateStaticParams() {
  const slugs = getAllAreaSlugs();
  return slugs.map((slug) => ({
    slug: slug,
  }));
}

// Server component wrapper - resolve params, fetch data, and pass to client
export default async function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const areaName = slugToArea(slug);
  if (!areaName) {
    notFound();
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/areas/${slug}`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      notFound();
    }

    const data = await response.json();

    if (!data.stats) {
      notFound();
    }

    return <AreaClient slug={slug} initialData={data} />;
  } catch (error) {
    notFound();
  }
}
