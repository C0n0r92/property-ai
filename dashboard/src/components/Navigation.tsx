'use client';

import Link from "next/link";
import { useState } from "react";
import { AuthButtons } from "@/components/auth/AuthButtons";
import { LoginModal } from "@/components/auth/LoginModal";
import { useAuth } from "@/components/auth/AuthProvider";

export function Navigation() {
  const { user } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 200 200"
                  fill="none"
                  className="drop-shadow-lg"
                >
                  {/* House outline - roof and walls */}
                  <path
                    d="M 20 90 L 100 20 L 180 90 L 180 180 L 20 180 Z"
                    fill="#3B73C5"
                    stroke="#FFFFFF"
                    strokeWidth="8"
                    strokeLinejoin="round"
                  />
                  
                  {/* Inner house shape */}
                  <path
                    d="M 40 100 L 100 50 L 160 100 L 160 165 L 40 165 Z"
                    fill="#4A85D9"
                    stroke="#FFFFFF"
                    strokeWidth="6"
                    strokeLinejoin="round"
                  />
                  
                  {/* Chart bars */}
                  <rect x="50" y="130" width="18" height="25" fill="#FFFFFF" rx="2" />
                  <rect x="75" y="115" width="18" height="40" fill="#FFFFFF" rx="2" />
                  <rect x="100" y="125" width="18" height="30" fill="#FFFFFF" rx="2" />
                  <rect x="125" y="105" width="18" height="50" fill="#FFFFFF" rx="2" />
                  
                  {/* Trend line with dots */}
                  <circle cx="59" cy="125" r="5" fill="#FFFFFF" />
                  <circle cx="84" cy="110" r="5" fill="#FFFFFF" />
                  <circle cx="109" cy="118" r="5" fill="#FFFFFF" />
                  <circle cx="134" cy="95" r="5" fill="#FFFFFF" />
                  
                  <path
                    d="M 59 125 L 84 110 L 109 118 L 134 95"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  Irish Property Data
                </span>
                <span className="text-[10px] text-gray-500 -mt-1 tracking-wider uppercase">Market Intelligence</span>
              </div>
            </Link>

            <div className="flex items-center gap-1">
              <Link
                href="/map"
                className="px-4 py-2 rounded-lg text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors font-medium"
              >
                Map
              </Link>
              <Link
                href="/areas"
                className="px-4 py-2 rounded-lg text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors font-medium"
              >
                Areas
              </Link>
              <Link
                href="/blog"
                className="px-4 py-2 rounded-lg text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors font-medium"
              >
                Blog
              </Link>
              <Link
                href="/mortgage-calc"
                className="px-4 py-2 rounded-lg text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors font-medium"
              >
                Mortgage
              </Link>
              {user && (
                <Link
                  href="/saved"
                  className="px-4 py-2 rounded-lg text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors font-medium"
                >
                  Saved
                </Link>
              )}
              <Link
                href="/insights"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 text-emerald-400 hover:from-emerald-500/20 hover:to-cyan-500/20 transition-colors font-medium flex items-center gap-2"
              >
                <span>Insights</span>
                <span className="text-[10px] bg-gradient-to-r from-amber-400 to-orange-500 text-black px-1.5 py-0.5 rounded-full font-bold">PRO</span>
              </Link>
              {!user && (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-4 py-2 rounded-lg text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors font-medium"
                >
                  Login
                </button>
              )}
              <div className="ml-2">
                <AuthButtons />
              </div>
            </div>
          </div>
        </div>
      </nav>
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  );
}
