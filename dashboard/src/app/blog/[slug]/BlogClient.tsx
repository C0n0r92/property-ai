'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useEffect } from 'react';
import { NewsletterSignup } from '@/components/NewsletterSignup';
import { ReadingProgress } from '@/components/ReadingProgress';
import { BlogVoteButton } from '@/components/BlogVoteButton';
import { BlogShareButton } from '@/components/BlogShareButton';
import { BlogViewTracker } from '@/components/BlogViewTracker';
import { articles } from '@/lib/blog-articles';
import { useBlogAlertTracking } from '@/hooks/useBlogAlertTracking';

interface BlogClientProps {
  slug: string;
}

// Function to convert markdown to HTML
function processMarkdownToHtml(content: string): string {
  // Remove template literal backticks and trim
  let processed = content.replace(/^`|`$/g, '').trim();

  // Handle images
  processed = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="w-full rounded-lg shadow-lg mb-4 mt-6" />');

  // Handle links
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline font-medium" target="_blank" rel="noopener noreferrer">$1</a>');

  // Handle headers
  processed = processed.replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold text-slate-900 mt-8 mb-3">$1</h3>');
  processed = processed.replace(/^## (.*$)/gm, '<h2 class="text-2xl font-semibold text-slate-900 mt-10 mb-4">$1</h2>');
  processed = processed.replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold text-slate-900 mt-12 mb-6">$1</h1>');

  // Handle bold text
  processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Handle italic text
  processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Handle list items (convert to paragraphs with bullet points)
  processed = processed.replace(/^- (.*$)/gm, '<p class="text-slate-700 leading-relaxed mb-4 text-lg">• $1</p>');

  // Handle regular paragraphs (lines that are not headers or lists)
  const lines = processed.split('\n');
  const htmlLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('<h') && !trimmed.startsWith('<p') && !trimmed.startsWith('<img') && !trimmed.startsWith('<a')) {
      htmlLines.push(`<p class="text-slate-700 leading-relaxed mb-4 text-lg">${trimmed}</p>`);
    } else if (trimmed) {
      htmlLines.push(trimmed);
    }
  }

  return htmlLines.join('\n');
}

export default function BlogClient({ slug }: BlogClientProps) {
  const article = articles[slug as keyof typeof articles];

  if (!article) {
    notFound();
  }

  // Process markdown to HTML
  const htmlContent = processMarkdownToHtml(article.content);

  // Blog alert tracking
  const { startBlogTracking, stopBlogTracking, trackEngagement } = useBlogAlertTracking();

  // Start tracking when component mounts
  useEffect(() => {
    const blogContext = {
      title: article.title,
      slug: slug,
      excerpt: article.excerpt,
    };

    startBlogTracking(blogContext);

    // Track user engagement events
    const handleScroll = () => trackEngagement();
    const handleClick = () => trackEngagement();

    // Add event listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('click', handleClick);

    // Cleanup on unmount
    return () => {
      stopBlogTracking();
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleClick);
    };
  }, [slug, article.title, article.excerpt, startBlogTracking, stopBlogTracking, trackEngagement]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <BlogViewTracker articleSlug={slug} />
      <ReadingProgress />

      {/* Hero Section with Article Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-blue-900 to-purple-900">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 lg:py-24">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium mb-6">
              <span>📊</span>
              Research Article
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              {article.title}
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8">
              {article.excerpt}
            </p>
            <div className="flex items-center justify-center gap-6 text-white/80">
              <div className="flex items-center gap-2">
                <span>👤</span>
                <span>{article.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span>{new Date(article.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>⏱️</span>
                <span>{article.readTime}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="prose prose-lg max-w-none">
          <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        </div>

        {/* Share and Actions */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <BlogVoteButton articleSlug={slug} />
            <div className="flex items-center gap-4">
              <BlogShareButton
                title={article.title}
                url={`/blog/${slug}`}
                excerpt={article.excerpt}
              />
            </div>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="mt-16">
          <NewsletterSignup />
        </div>

        {/* Related Articles */}
        {article.relatedArticles && article.relatedArticles.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-8">Related Research</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {article.relatedArticles.map((relatedSlug: string) => {
                const relatedArticle = articles[relatedSlug as keyof typeof articles];
                if (!relatedArticle) return null;

                return (
                  <Link
                    key={relatedSlug}
                    href={`/blog/${relatedSlug}`}
                    className="block p-6 bg-white rounded-lg border border-slate-200 hover:shadow-lg transition-shadow"
                  >
                    <h3 className="font-semibold text-slate-900 mb-2">
                      {relatedArticle.title}
                    </h3>
                    <p className="text-slate-600 text-sm">
                      {relatedArticle.excerpt}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}