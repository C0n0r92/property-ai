'use client';

import { useAuth } from './AuthProvider';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
    window.location.href = '/';
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--muted)] rounded-lg hover:bg-[var(--muted-hover)] transition-colors"
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.full_name || user.email}
            className="w-6 h-6 rounded-full"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-[var(--primary)] flex items-center justify-center">
            <span className="text-white text-sm font-bold">U</span>
          </div>
        )}
        <span className="text-sm font-medium max-w-[120px] truncate">
          {user.full_name || user.email.split('@')[0]}
        </span>
        {user.tier === 'premium' && (
          <span className="text-xs bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">
            PRO
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg py-2 z-50">
          <div className="px-4 py-2 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{user.full_name || user.email.split('@')[0]}</p>
              {user.tier === 'premium' ? (
                <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full">
                  Premium
                </span>
              ) : (
                <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded-full border border-gray-600/50">
                  Free
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">{user.email}</p>
          </div>

          <Link
            href={user.tier === 'free' ? '/insights' : '/saved'}
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--muted)] transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {user.tier === 'free' ? 'Premium Features' : 'Manage Saved'}
          </Link>

          {user.tier === 'free' && (
            <div className="border-t border-[var(--border)] mt-2">
              <div className="px-4 py-3">
                <div className="space-y-1.5 mb-4">
                  <div className="text-xs text-emerald-400 font-medium">Premium Features:</div>
                  <div className="text-xs text-[var(--muted-foreground)] leading-relaxed space-y-1">
                    <div>• AI Price Predictions</div>
                    <div>• Hidden Deal Finder</div>
                    <div>• Area Trend Forecasts</div>
                    <div>• Save & Track Properties</div>
                    <div>• Investment Scoring</div>
                  </div>
                </div>

                <Link
                  href="/insights"
                  className="inline-flex items-center justify-center w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Upgrade Now
                </Link>
              </div>
            </div>
          )}

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--muted)] transition-colors w-full text-left text-red-500"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

