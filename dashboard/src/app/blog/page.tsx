import type { Metadata } from "next";
import Link from "next/link";
import { getArticleIndex, topicOf, TOPICS } from "@/lib/blog";
import { jsonLd, SITE_NAME, SITE_URL } from "@/lib/site";
import BlogIndex, { type IndexArticle } from "./BlogIndex";

export const metadata: Metadata = {
  title: "Dublin Property Market Research",
  description:
    "Research on the Dublin property market from real sales: how far over asking homes sell, area by area, plus timing, mortgages and rental yields.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Dublin property market research",
    description:
      "How far over asking Dublin homes sell, area by area, plus timing, mortgages and rental yields. Drawn from real Dublin sales.",
    url: "/blog",
    type: "website",
  },
};

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" });

export default function BlogPage() {
  const articles: IndexArticle[] = getArticleIndex().map((a) => ({
    slug: a.slug!,
    title: a.title,
    excerpt: a.excerpt,
    date: a.date,
    dateLabel: longDate(a.date),
    readTime: a.readTime,
    topic: topicOf(a.category),
  }));
  const [lead, ...rest] = articles;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${SITE_NAME} research`,
    url: `${SITE_URL}/blog`,
    publisher: { "@id": `${SITE_URL}/#organization` },
    blogPost: articles.slice(0, 20).map((a) => ({
      "@type": "BlogPosting",
      headline: a.title,
      url: `${SITE_URL}/blog/${a.slug}`,
      datePublished: a.date,
    })),
  };

  return (
    <main className="rp-wrap rp-blog">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      <header className="rp-blog-head">
        <p className="rp-eyebrow">Research</p>
        <h1 className="rp-blog-title">
          The Dublin market, from the sales themselves.
        </h1>
        <p className="rp-blog-lede">
          {articles.length} pieces on how Dublin homes really sell: how far
          over asking, where, for which homes, and when. Each one starts from
          recorded sales, not opinion. For the latest figures, see the{" "}
          <Link href="/reports">monthly over-asking report</Link> and{" "}
          <Link href="/areas">every area&apos;s page</Link>.
        </p>
      </header>

      {lead && (
        <Link href={`/blog/${lead.slug}`} className="rp-blog-lead">
          <span className="rp-blog-meta">
            Latest · {lead.topic} · {lead.dateLabel}
          </span>
          <span className="rp-blog-lead-title">{lead.title}</span>
          <span className="rp-blog-lead-excerpt">{lead.excerpt}</span>
          <span className="rp-blog-read">Read it →</span>
        </Link>
      )}

      <BlogIndex articles={rest} topics={[...TOPICS]} />

      <aside className="rp-blog-cta">
        <div>
          <h2 className="rp-h2">Bidding on a home right now?</h2>
          <p className="rp-prose">
            Put in its area, type and asking price and see what similar homes
            really sold for.
          </p>
        </div>
        <Link href="/" className="rp-button rp-button--ink">
          Check a home, free
        </Link>
      </aside>
    </main>
  );
}
