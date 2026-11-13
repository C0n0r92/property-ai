/**
 * Blog content helpers for reading article files
 * Replaces the monolithic articles object with file-based storage
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export interface ArticleMeta {
  slug?: string; // Optional slug field for index pages
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  featured?: boolean; // Optional featured flag for blog index
  tags: string[];
  author: string;
  views: number;
  relatedArticles: string[];
}

export interface Article extends ArticleMeta {
  content: string;
}

// Path to blog content directory
const CONTENT_DIR = join(process.cwd(), 'public/blog-content');

/**
 * Articles taken off the blog, and where their address now leads:
 * - guides to tools the site no longer has (the map, comparison, planning);
 * - placeholder pages with headings but no findings, and short pages whose
 *   figures contradict themselves. Each goes to the live page or fuller
 *   article that answers the same question.
 */
export const RETIRED: ReadonlyMap<string, string> = new Map([
  ['compare-properties-complete-guide', '/blog'],
  ['dublin-planning-permission-tool-guide', '/blog'],
  ['dublin-property-map-guide', '/areas'],
  ['geographic-price-intelligence', '/areas'],
  ['properties-over-asking-dublin', '/areas'],
  ['over-asking-phenomenon-2024', '/areas'],
  ['complete-area-rankings', '/areas'],
  ['dublin-price-per-square-meter', '/areas'],
  ['fastest-growing-areas-dublin', '/areas'],
  ['property-types-analysis', '/reports'],
  ['detached-houses-dominance', '/reports'],
  ['bedroom-count-analysis', '/blog/bedroom-count-property-values'],
  ['asking_price_strategy', '/blog/asking-price-strategy-dublin'],
  ['dublin-bidding-wars-strategy-analysis', '/blog/dublin-bidding-wars-analysis'],
  ['dublin-rental-yield-analysis', '/blog/rental-yields-buy-to-let-2025'],
  ['amenities-impact-prices', '/blog'],
  ['planning-permission-activity', '/blog'],
]);

export const RETIRED_SLUGS: ReadonlySet<string> = new Set(RETIRED.keys());

/** Readers browse by these topics; each article's category maps to one. */
export const TOPICS = ['Market', 'Areas', 'Buying', 'Investing and renting', 'Planning'] as const;
export type Topic = (typeof TOPICS)[number];

const TOPIC_OF_CATEGORY: Record<string, Topic> = {
  'Market Analysis': 'Market',
  'Market Trends': 'Market',
  'Market Guide': 'Areas',
  'Location Analysis': 'Areas',
  'Area Analysis': 'Areas',
  'First-Time Buyers': 'Buying',
  'Financial Analysis': 'Buying',
  'Tool Guide': 'Buying',
  Investment: 'Investing and renting',
  'Investment Analysis': 'Investing and renting',
  Renting: 'Investing and renting',
  'Rental Analysis': 'Investing and renting',
  Planning: 'Planning',
};

export function topicOf(category: string): Topic {
  return TOPIC_OF_CATEGORY[category] ?? 'Market';
}

/**
 * Read article metadata from JSON file
 * @param slug - Article slug (e.g., 'blog60-d8-value-investor-hotspot')
 * @returns Article metadata or null if not found
 */
export function readArticleMeta(slug: string): ArticleMeta | null {
  try {
    const metaPath = join(CONTENT_DIR, `${slug}.meta.json`);
    const content = readFileSync(metaPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

/**
 * Read article content from markdown file
 * @param slug - Article slug
 * @returns Markdown content string or null if not found
 */
export function readArticleContent(slug: string): string | null {
  try {
    const contentPath = join(CONTENT_DIR, `${slug}.md`);
    return readFileSync(contentPath, 'utf-8');
  } catch (error) {
    return null;
  }
}

/**
 * Read both metadata and content for an article
 * @param slug - Article slug
 * @returns Complete article object or null if not found
 */
export function readArticle(slug: string): Article | null {
  const meta = readArticleMeta(slug);
  const content = readArticleContent(slug);

  if (!meta || !content) {
    return null;
  }

  return {
    ...meta,
    content
  };
}

/**
 * Get all available article slugs
 * @returns Array of article slugs
 */
export function getAllSlugs(): string[] {
  try {
    const files = readdirSync(CONTENT_DIR);
    // Get unique slugs from .meta.json files
    const slugs = files
      .filter(file => file.endsWith('.meta.json'))
      .map(file => file.replace('.meta.json', ''))
      .filter(slug => !RETIRED_SLUGS.has(slug));
    return slugs;
  } catch (error) {
    return [];
  }
}

/**
 * Get metadata for all articles (for blog index page)
 * @returns Array of article metadata with slugs, sorted by date descending
 */
export function getArticleIndex(): ArticleMeta[] {
  const slugs = getAllSlugs();
  const articles = slugs
    .map(slug => {
      const meta = readArticleMeta(slug);
      if (!meta) return null;
      return { ...meta, slug } as ArticleMeta;
    })
    .filter((meta): meta is ArticleMeta & { slug: string } => meta !== null);

  // Sort by date descending (newest first)
  return articles.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

/**
 * Get articles by category
 * @param category - Category name
 * @returns Array of article metadata in that category
 */
export function getArticlesByCategory(category: string): ArticleMeta[] {
  return getArticleIndex().filter(article => article.category === category);
}

/**
 * Get articles by tag
 * @param tag - Tag name
 * @returns Array of article metadata with that tag
 */
export function getArticlesByTag(tag: string): ArticleMeta[] {
  return getArticleIndex().filter(article => article.tags.includes(tag));
}
