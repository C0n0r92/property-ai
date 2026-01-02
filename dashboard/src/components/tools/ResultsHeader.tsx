'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface ResultsHeaderProps {
  address: string;
  coordinates: { lat: number; lng: number };
  score?: number; // For amenities tool
  onNewSearch?: () => void;
  toolName?: 'planning' | 'amenities';
  toolTitle?: string;
}

export function ResultsHeader({
  address,
  coordinates,
  score,
  onNewSearch,
  toolName = 'planning',
  toolTitle = 'Planning Analysis'
}: ResultsHeaderProps) {
  const router = useRouter();

  const handleNewSearch = () => {
    if (onNewSearch) {
      onNewSearch();
    } else {
      router.push(`/tools/${toolName}`);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/tools/${toolName}?lat=${coordinates.lat}&lng=${coordinates.lng}&address=${encodeURIComponent(address)}`;

    try {
      await navigator.clipboard.writeText(url);
      // In a real app, you'd show a toast notification here
      alert('Link copied to clipboard!');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="mb-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-[var(--foreground-muted)] mb-4">
        <a href="/" className="hover:text-[var(--foreground)] transition-colors">Home</a>
        <span>/</span>
        <a href="/tools" className="hover:text-[var(--foreground)] transition-colors">Tools</a>
        <span>/</span>
        <span className="text-[var(--foreground)]">{toolTitle}</span>
      </nav>

      {/* Header */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Address and Score */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">
              {toolTitle}
            </h1>
            <div className="flex items-center gap-3">
              <div className="text-lg text-[var(--foreground-secondary)]">
                📍 {address}
              </div>
              {score !== undefined && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-full">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {score}/10 Walkability
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--background)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg text-[var(--foreground)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              Share
            </button>

            <button
              onClick={handleNewSearch}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Analyze New Address
            </button>
          </div>
        </div>

        {/* Coordinates (for debugging/confirmation) */}
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <div className="text-xs text-[var(--foreground-muted)]">
            Coordinates: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
          </div>
        </div>
      </div>
    </div>
  );
}
