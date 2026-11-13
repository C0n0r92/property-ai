import { describe, expect, it } from 'vitest';
import { getAllSlugs, readArticleMeta, searchDescription, searchTitle } from './blog';

describe('search titles and descriptions', () => {
  const slugs = getAllSlugs();

  it('finds the live articles', () => {
    expect(slugs.length).toBeGreaterThan(50);
  });

  it.each(slugs)('%s fits a search result', (slug) => {
    const meta = readArticleMeta(slug)!;
    expect(searchTitle(meta).length).toBeLessThanOrEqual(60);
    expect(searchDescription(meta).length).toBeLessThanOrEqual(155);
  });

  it('prefers the short versions and falls back to the headline and excerpt', () => {
    const base = { title: 'Headline', excerpt: 'Excerpt', category: '', date: '', readTime: '', tags: [], author: '', views: 0, relatedArticles: [] };
    expect(searchTitle(base)).toBe('Headline');
    expect(searchDescription(base)).toBe('Excerpt');
    expect(searchTitle({ ...base, seoTitle: 'Short' })).toBe('Short');
    expect(searchDescription({ ...base, seoDescription: 'Brief' })).toBe('Brief');
  });
});
