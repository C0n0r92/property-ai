"use client";

import Link from "next/link";
import { useState } from "react";

export interface IndexArticle {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  dateLabel: string;
  readTime: string;
  topic: string;
}

/**
 * The article list with topic filters. Every article is in the HTML from the
 * start (the filter only hides some), so search engines see them all.
 */
export default function BlogIndex({
  articles,
  topics,
}: {
  articles: IndexArticle[];
  topics: string[];
}) {
  const [topic, setTopic] = useState<string | null>(null);
  const present = topics.filter((t) => articles.some((a) => a.topic === t));

  return (
    <section className="rp-blog-list-section" aria-label="All research">
      <div className="rp-blog-filters" role="group" aria-label="Filter by topic">
        {[null, ...present].map((t) => (
          <button
            key={t ?? "all"}
            type="button"
            className="rp-blog-filter"
            aria-pressed={topic === t}
            onClick={() => setTopic(t)}
          >
            {t ?? "All"}
            <span className="rp-blog-filter-count">
              {t ? articles.filter((a) => a.topic === t).length : articles.length}
            </span>
          </button>
        ))}
      </div>

      <ol className="rp-blog-list">
        {articles.map((a) => (
          <li key={a.slug} hidden={topic !== null && a.topic !== topic}>
            <Link href={`/blog/${a.slug}`} className="rp-blog-item">
              <span className="rp-blog-meta">
                {a.topic} · <time dateTime={a.date}>{a.dateLabel}</time> ·{" "}
                {a.readTime}
              </span>
              <span className="rp-blog-item-title">{a.title}</span>
              <span className="rp-blog-item-excerpt">{a.excerpt}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
