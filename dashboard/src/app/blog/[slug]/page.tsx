import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getAllSlugs, readArticle, readArticleMeta, RETIRED_SLUGS, topicOf } from "@/lib/blog";
import { renderArticle } from "@/lib/blog-markdown";
import { jsonLd, SITE_NAME, SITE_URL } from "@/lib/site";
import ArticleChart from "./ArticleChart";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const article = RETIRED_SLUGS.has(slug) ? null : readArticleMeta(slug);
  if (!article) return { title: "Article not found", robots: { index: false } };

  const url = `/blog/${slug}`;
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: url },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      url,
      type: "article",
      publishedTime: article.date,
      section: article.category,
      tags: article.tags,
    },
    twitter: { card: "summary_large_image", title: article.title, description: article.excerpt },
  };
}

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" });

export default async function ArticlePage({ params }: { params: Params }) {
  const { slug } = await params;
  if (RETIRED_SLUGS.has(slug)) permanentRedirect("/blog");
  const article = readArticle(slug);
  if (!article) notFound();

  const { segments, headings } = renderArticle(article.content);
  const topic = topicOf(article.category);
  const related = (article.relatedArticles ?? [])
    .filter((s) => s !== slug && !RETIRED_SLUGS.has(s))
    .map((s) => ({ slug: s, meta: readArticleMeta(s) }))
    .filter((r): r is { slug: string; meta: NonNullable<typeof r.meta> } => r.meta !== null)
    .slice(0, 3);

  const url = `${SITE_URL}/blog/${slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: article.title,
        description: article.excerpt,
        datePublished: article.date,
        dateModified: article.date,
        url,
        mainEntityOfPage: url,
        image: `${url}/opengraph-image`,
        articleSection: article.category,
        keywords: article.tags.join(", "),
        inLanguage: "en-IE",
        author: { "@type": "Organization", name: SITE_NAME, url: `${SITE_URL}/` },
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Research", item: `${SITE_URL}/blog` },
          { "@type": "ListItem", position: 3, name: article.title, item: url },
        ],
      },
    ],
  };

  return (
    <main className="rp-wrap rp-article-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />

      <nav className="rp-crumbs" aria-label="Breadcrumb">
        <Link href="/blog">Research</Link>
        <span aria-hidden="true">/</span>
        <span>{topic}</span>
      </nav>

      <header className="rp-article-head">
        <h1 className="rp-article-title">{article.title}</h1>
        <p className="rp-article-dek">{article.excerpt}</p>
        <p className="rp-blog-meta">
          <time dateTime={article.date}>{longDate(article.date)}</time> · {article.readTime}
        </p>
      </header>

      <div className="rp-article-layout">
        {headings.length >= 3 && (
          <aside className="rp-toc" aria-label="In this article">
            <p className="rp-toc-title">In this article</p>
            <ol>
              {headings.map((h) => (
                <li key={h.id}>
                  <a href={`#${h.id}`}>{h.text}</a>
                </li>
              ))}
            </ol>
          </aside>
        )}

        <article className="rp-article">
          {segments.map((segment, i) =>
            segment.type === "chart" ? (
              <ArticleChart key={i} name={segment.name} />
            ) : (
              <div key={i} dangerouslySetInnerHTML={{ __html: segment.html }} />
            ),
          )}

          <aside className="rp-article-cta">
            <p className="rp-article-cta-title">See it for a home you&apos;re watching.</p>
            <p>
              Enter a Dublin home&apos;s area, type and asking price, and see what
              similar homes really sold for and how far over asking the winning
              bids went.
            </p>
            <Link href="/" className="rp-button rp-button--ink">
              Check a home, free
            </Link>
          </aside>
        </article>
      </div>

      {related.length > 0 && (
        <section className="rp-related" aria-labelledby="rp-related-title">
          <h2 className="rp-h2" id="rp-related-title">
            Read next
          </h2>
          <ul>
            {related.map(({ slug: s, meta }) => (
              <li key={s}>
                <Link href={`/blog/${s}`} className="rp-blog-item">
                  <span className="rp-blog-meta">
                    {topicOf(meta.category)} · {longDate(meta.date)}
                  </span>
                  <span className="rp-blog-item-title">{meta.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
