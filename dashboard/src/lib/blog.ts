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
      .map(file => file.replace('.meta.json', ''));
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
