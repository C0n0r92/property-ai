import type { MetadataRoute } from "next";
import { getArticleIndex } from "@/lib/blog";
import { buildAreaIndex } from "@/lib/real-price/area-page";
import { availableMonths } from "@/lib/real-price/monthly-report";
import { getSalesStore } from "@/lib/real-price/store";
import { SITE_URL } from "@/lib/site";

/** Every page worth indexing: the price check, area pages, the blog and its articles. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const store = await getSalesStore();
  const areas = buildAreaIndex(store).filter((a) => a.kind === "district" || a.count >= 30);
  const dataDate = new Date(store.asOf);
  const articles = getArticleIndex().filter((a) => a.slug);
  const newestArticle = articles[0]?.date;

  return [
    {
      url: `${SITE_URL}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/areas`,
      lastModified: dataDate,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...areas.map((area) => ({
      url: `${SITE_URL}/areas/${area.slug}`,
      lastModified: dataDate,
      changeFrequency: "daily" as const,
      priority: area.kind === "district" ? 0.8 : 0.7,
    })),
    {
      url: `${SITE_URL}/reports`,
      lastModified: dataDate,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...availableMonths(store).map((month, i) => ({
      url: `${SITE_URL}/reports/${month}`,
      lastModified: dataDate,
      changeFrequency: (i === 0 ? "weekly" : "monthly") as "weekly" | "monthly",
      priority: i === 0 ? 0.8 : 0.5,
    })),
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
