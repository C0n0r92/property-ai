'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { useState, useRef, useEffect } from 'react';
import { RecentlyViewedMobile } from '@/components/RecentlyViewedMobile';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useUI } from '@/contexts/UIContext';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  requiresAuth?: boolean;
}

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const [isRecentlyViewedOpen, setIsRecentlyViewedOpen] = useState(false);
  const toolsDropdownRef = useRef<HTMLDivElement>(null);
  const { recentlyViewed } = useRecentlyViewed();
  const isMobile = useIsMobile();
  const { isPropertyCardOpen } = useUI();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(event.target as Node)) {
        setIsToolsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navItems: NavItem[] = [
    {
      href: '/map',
      label: 'Map',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V7m0 0L9 4" />
        </svg>
      ),
    },
    {
      href: '/areas',
      label: 'Areas',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      href: '/tools/compare',
      label: 'Tools',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      href: '/recent',
      label: 'Recent',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: '/blog',
      label: 'Blog',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      href: '/alerts',
      label: 'Profile',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      requiresAuth: true,
    },
  ];

  // Filter out auth-required items if user is not authenticated
  const visibleItems = navItems.filter(item => !item.requiresAuth || user);

  // Check if current path matches or starts with nav item href
  const isActive = (href: string) => {
    if (href === '/map' && pathname === '/') return true; // Homepage redirects to map
    if (href === '/map' && pathname.startsWith('/map')) return true;
    if (href === '/areas' && pathname.startsWith('/areas')) return true;
    if (href === '/tools/compare' && pathname.startsWith('/tools')) return true;
    if (href === '/blog' && pathname.startsWith('/blog')) return true;
    if (href === '/alerts' && pathname.startsWith('/alerts')) return true;
    if (href === '/login' && pathname.startsWith('/login')) return true;
    // Recent is never "active" as it's a modal trigger
    return false;
  };

  // Hide bottom nav on mobile when property card is open
  if (isMobile && isPropertyCardOpen) {
    return null;
  }

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface)] border-t border-[var(--border)] pb-safe-or-2">
        <div className="flex items-center justify-around px-2 py-2">
          {visibleItems.map((item) => {
            const active = isActive(item.href);

            // Special handling for Recent button
            if (item.href === '/recent') {
              return (
                <button
                  key={item.href}
                  onClick={() => setIsRecentlyViewedOpen(true)}
                  className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all duration-200 min-h-[56px] flex-1 relative ${
                    'text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
                  }`}
                >
                  <div className="mb-1 relative">
                    {item.icon}
                    {recentlyViewed.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                        {recentlyViewed.length > 9 ? '9+' : recentlyViewed.length}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium leading-tight text-center">
                    {item.label}
                  </span>
                </button>
              );
            }

            // Special handling for Tools dropdown
            if (item.href === '/tools/compare') {
              return (
                <div key={item.href} className="relative flex-1" ref={toolsDropdownRef}>
                  <button
                    onClick={() => setIsToolsDropdownOpen(!isToolsDropdownOpen)}
                    className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all duration-200 min-h-[56px] w-full ${
                      active
                        ? 'text-[var(--accent)] bg-[var(--accent)]/10'
                        : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
                    }`}
                  >
                    <div className={`mb-1 ${active ? 'text-[var(--accent)]' : ''}`}>
                      {item.icon}
                    </div>
                    <span className="text-xs font-medium leading-tight text-center flex items-center gap-1">
                      {item.label}
                      <svg
                        className={`w-3 h-3 transition-transform ${isToolsDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </button>

                  {isToolsDropdownOpen && (
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <Link
                        href="/tools/compare"
                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                        onClick={() => setIsToolsDropdownOpen(false)}
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-blue-600">C</span>
                        </div>
                        <div>
                          <div className="font-medium">Property Comparison</div>
                          <div className="text-xs text-gray-500">Compare up to 5 properties</div>
                        </div>
                      </Link>

                      <Link
                        href="/mortgage-calc"
                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                        onClick={() => setIsToolsDropdownOpen(false)}
                      >
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <span className="text-emerald-600">$</span>
                        </div>
                        <div>
                          <div className="font-medium">Mortgage Calculator</div>
                          <div className="text-xs text-gray-500">Calculate payments & affordability</div>
                        </div>
                      </Link>

                      <div className="border-t border-gray-100 my-1"></div>

                      <div className="flex items-center gap-3 px-4 py-3 text-sm text-gray-400">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <span className="text-purple-600">B</span>
                        </div>
                        <div>
                          <div className="font-medium">Bid Calculator</div>
                          <div className="text-xs text-gray-500">Coming soon</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all duration-200 min-h-[56px] flex-1 ${
                  active
                    ? 'text-[var(--accent)] bg-[var(--accent)]/10'
                    : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
                }`}
              >
                <div className={`mb-1 ${active ? 'text-[var(--accent)]' : ''}`}>
                  {item.icon}
                </div>
                <span className="text-xs font-medium leading-tight text-center">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Recently Viewed Mobile Panel */}
      <RecentlyViewedMobile
        isOpen={isRecentlyViewedOpen}
        onClose={() => setIsRecentlyViewedOpen(false)}
      />
    </>
  );
}
