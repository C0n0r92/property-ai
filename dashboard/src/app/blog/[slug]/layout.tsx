import { Metadata } from 'next';
import { articles } from './page';
import { BlogArticleStructuredData } from '@/components/BlogArticleStructuredData';

// Generate metadata for each blog post
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = articles[slug as keyof typeof articles];

  if (!article) {
    return {
      title: 'Article Not Found | Irish Property Data',
    };
  }

  return {
    title: `${article.title} | Irish Property Data Research`,
    description: article.excerpt,
    keywords: article.tags.join(', '),
    authors: [{ name: 'Irish Property Data' }],
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: 'article',
      publishedTime: article.date,
      authors: ['Irish Property Data'],
      tags: article.tags,
      images: [
        {
          url: `/blog/${slug}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${article.title} - Irish Property Data Research`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt,
      images: [`/blog/${slug}/opengraph-image`],
    },
    alternates: {
      canonical: `/blog/${slug}`,
    },
  };
}

export default async function BlogPostLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = articles[slug as keyof typeof articles];

  if (!article) {
    return children;
  }

  return (
    <>
      <BlogArticleStructuredData
        title={article.title}
        excerpt={article.excerpt}
        content={article.content}
        date={article.date}
        tags={article.tags}
        url={`https://irishpropertydata.com/blog/${slug}`}
      />
      {children}
    </>
  );
}
