'use client';

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { AuthButtons } from "@/components/auth/AuthButtons";
import { LoginModal } from "@/components/auth/LoginModal";
import { useAuth } from "@/components/auth/AuthProvider";
import { RecentlyViewedDropdown } from "@/components/RecentlyViewedDropdown";

export function Navigation() {
  const { user } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const toolsDropdownRef = useRef<HTMLDivElement>(null);

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

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg group-hover:scale-105 transition-transform">
                <span className="text-white font-extrabold text-sm tracking-tight">IPD</span>
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="font-bold text-[15px] tracking-tight text-gray-900">
                  Irish Property Data
                </span>
                <span className="text-[10px] text-gray-400 -mt-1 tracking-[1.2px] uppercase">Market Intelligence</span>
              </div>
            </Link>

            {/* Mobile Login Button */}
            <div className="md:hidden flex items-center gap-2">
              {!user && (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-3 py-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors font-medium text-sm"
                >
                  Sign In
                </button>
              )}
              {user && (
                <div className="ml-2">
                  <AuthButtons />
                </div>
              )}
            </div>

            <div className="hidden md:flex items-center gap-1">
              <Link
                href="/map"
                className="px-4 py-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors font-medium text-sm"
              >
                Map
              </Link>
              <Link
                href="/areas"
                className="px-4 py-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors font-medium text-sm"
              >
                Areas
              </Link>

              {/* Tools Dropdown */}
              <div className="relative" ref={toolsDropdownRef}>
                <button
                  onClick={() => setIsToolsDropdownOpen(!isToolsDropdownOpen)}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors font-medium text-sm"
                >
                  Tools ▾
                </button>

                {isToolsDropdownOpen && (
                  <div className="absolute top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
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

                    <Link
                      href="/mortgage-calc"
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                      onClick={() => setIsToolsDropdownOpen(false)}
                    >
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-purple-600">B</span>
                      </div>
                      <div>
                        <div className="font-medium">Bid Calculator</div>
                        <div className="text-xs text-gray-500">Coming soon</div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>

              <Link
                href="/blog"
                className="px-4 py-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors font-medium text-sm"
              >
                Blog
              </Link>
              <Link
                href="/pricing"
                className="px-4 py-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors font-medium text-sm"
              >
                Pricing
              </Link>
              <RecentlyViewedDropdown />
              {user && (
                <Link
                  href="/alerts"
                  className="px-4 py-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors font-medium text-sm"
                >
                  Alerts
                </Link>
              )}
              {!user && (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors font-medium text-sm"
                >
                  Sign In
                </button>
              )}
              {!user && (
                <Link
                  href="/pricing"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-semibold text-sm"
                >
                  Start Free →
                </Link>
              )}
              {user && (
                <div className="ml-2">
                  <AuthButtons />
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  );
}
