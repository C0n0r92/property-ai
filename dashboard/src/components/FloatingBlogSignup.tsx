'use client';

import { useState, useEffect } from 'react';
import { NewsletterSignup } from '@/components/NewsletterSignup';

interface FloatingBlogSignupProps {
  blogTitle: string;
  blogSlug: string;
}

export function FloatingBlogSignup({ blogTitle, blogSlug }: FloatingBlogSignupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSignupSuccess = () => {
    // Close the floating form after successful signup
    setIsExpanded(false);
    setTimeout(() => setShowSignup(false), 300); // Allow animation to complete
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;

      // Show floating CTA when user scrolls past 50% of viewport
      if (scrollPosition > windowHeight * 0.5) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
        setShowSignup(false);
        setIsExpanded(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignupClick = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      setShowSignup(true);
    } else {
      setTimeout(() => setShowSignup(false), 300); // Allow animation to complete
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50">
      {/* Main Floating CTA */}
      <div className="relative">
        {/* Expandable Signup Form */}
        {showSignup && (
          <div
            className={`absolute bottom-16 right-0 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 md:p-6 transform transition-all duration-300 ${
              isExpanded ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'
            }`}
          >
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold mb-3">
                <span>🤖</span>
                AI-Powered
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Get AI-Summarized Blogs
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Receive weekly market insights and get this blog summarized by AI delivered to your inbox.
              </p>
            </div>

            <NewsletterSignup
              title=""
              description=""
              compact={true}
              source="ai-summary"
              blogSlug={blogSlug}
              onSuccess={handleSignupSuccess}
            />

            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Floating Button */}
        <button
          onClick={handleSignupClick}
          className={`bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${
            isExpanded ? 'rotate-45' : ''
          }`}
          style={{
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg
            className={`w-6 h-6 transition-transform duration-300 ${isExpanded ? 'rotate-45' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </button>

        {/* Pulse effect when not expanded */}
        {!isExpanded && (
          <div className="absolute inset-0 rounded-full bg-blue-600 animate-ping opacity-20"></div>
        )}
      </div>
    </div>
  );
}
