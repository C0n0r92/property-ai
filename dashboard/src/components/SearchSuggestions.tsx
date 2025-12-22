'use client';

import { useMemo } from 'react';

interface SearchSuggestionsProps {
  query: string;
  articles: Array<{
    title: string;
    excerpt: string;
    tags: string[];
    category: string;
  }>;
  onSuggestionClick: (suggestion: string) => void;
  isVisible: boolean;
}

export function SearchSuggestions({ query, articles, onSuggestionClick, isVisible }: SearchSuggestionsProps) {
  const suggestions = useMemo(() => {
    if (!query || query.length < 2) return [];

    const queryLower = query.toLowerCase();
    const matches = new Set<string>();

    articles.forEach(article => {
      // Title matches
      if (article.title.toLowerCase().includes(queryLower)) {
        matches.add(article.title);
      }

      // Tag matches
      article.tags.forEach(tag => {
        if (tag.toLowerCase().includes(queryLower)) {
          matches.add(tag);
        }
      });

      // Category matches
      if (article.category.toLowerCase().includes(queryLower)) {
        matches.add(article.category);
      }
    });

    return Array.from(matches).slice(0, 8);
  }, [query, articles]);

  if (!isVisible || suggestions.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl mt-1 z-50 max-h-64 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
      <div className="p-2">
        <div className="text-xs text-slate-500 px-3 py-1 mb-1">Search suggestions</div>
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion)}
            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="truncate">{suggestion}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
