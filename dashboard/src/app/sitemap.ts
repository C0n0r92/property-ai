import type { MetadataRoute } from "next";
import { getArticleIndex } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

/** Every page worth indexing: the price check, the blog and its articles. */
export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getArticleIndex().filter((a) => a.slug);
  const newestArticle = articles[0]?.date;

  return [
    {
      url: `${SITE_URL}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: newestArticle ? new Date(newestArticle) : undefined,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...articles.map((article) => ({
      url: `${SITE_URL}/blog/${article.slug}`,
      lastModified: new Date(article.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    {
      url: `${SITE_URL}/real-price/privacy`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
