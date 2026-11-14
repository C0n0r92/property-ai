import type { MetadataRoute } from "next";
import { getArticleIndex } from "@/lib/blog";
import { buildAreaIndex } from "@/lib/real-price/area-page";
import { availableMonths } from "@/lib/real-price/monthly-report";
import { getSalesStore } from "@/lib/real-price/store";
import { allStreets, streetAreas } from "@/lib/real-price/street-page";
import { SITE_URL } from "@/lib/site";

// Built from the live database on request. Pre-building at deploy time would
// use the seed file (the build has no database), showing old figures.
export const dynamic = "force-dynamic";

/** Every page worth indexing: the price check, area and street pages, reports, the blog and its articles. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const store = await getSalesStore();
  const areas = buildAreaIndex(store).filter((a) => a.kind === "district" || a.count >= 30);
  const dataDate = new Date(store.asOf);
  const articles = getArticleIndex().filter((a) => a.slug);
  const newestArticle = articles[0]?.date;
  const [streets, streetAreaList] = await Promise.all([allStreets(), streetAreas()]);

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
    ...(streets.length
      ? [
          {
            url: `${SITE_URL}/streets`,
            lastModified: dataDate,
            changeFrequency: "weekly" as const,
            priority: 0.7,
          },
        ]
      : []),
    ...streetAreaList.map((a) => ({
      url: `${SITE_URL}/streets/in/${a.areaSlug}`,
      lastModified: dataDate,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...streets.map((s) => ({
      url: `${SITE_URL}/streets/${s.slug}`,
      lastModified: new Date(s.lastSale),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    {
      url: `${SITE_URL}/track-record`,
      lastModified: dataDate,
      changeFrequency: "weekly",
      priority: 0.6,
    },
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
