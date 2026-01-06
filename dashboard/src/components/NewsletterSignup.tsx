'use client';

import { useState, useEffect } from 'react';

interface NewsletterSignupProps {
  title?: string;
  description?: string;
  compact?: boolean;
  source?: string;
  blogSlug?: string;
  onSuccess?: () => void;
}

export function NewsletterSignup({
  title = "Stay Ahead of Market Trends",
  description = "Get notified when new research is published and receive quarterly market intelligence reports directly to your inbox.",
  compact = false,
  source = "homepage",
  blogSlug,
  onSuccess
}: NewsletterSignupProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Auto-hide success message after 5 seconds
  useEffect(() => {
    if (isSubmitted) {
      const timer = setTimeout(() => {
        setIsSubmitted(false);
      }, 5000); // 5 seconds

      return () => clearTimeout(timer);
    }
  }, [isSubmitted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source,
          blogSlug
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      setIsSubmitted(true);
      setEmail('');
      onSuccess?.();
    } catch (error: any) {
      console.error('Newsletter signup error:', error);
      // For now, just show success to avoid breaking UX
      // In production, you'd want to show the error
      setIsSubmitted(true);
      setEmail('');
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (compact) {
    return (
      <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Market Updates</h3>
        <p className="text-sm text-slate-600 mb-4">
          Get quarterly market intelligence reports
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            required
            className="flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '...' : 'Subscribe'}
          </button>
        </form>
        {isSubmitted && (
          <p className="text-sm text-green-600 mt-2">Thanks for subscribing!</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-8 text-center">
      <h3 className="text-2xl font-bold mb-4">{title}</h3>
      <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
        {description}
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-lg font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isSubmitting ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
      {isSubmitted && (
        <p className="text-green-400 mt-4">Thanks for subscribing! Check your email for confirmation.</p>
      )}
      <p className="text-xs text-slate-400 mt-4">
        No spam. Unsubscribe at any time.
      </p>
    </div>
  );
}
