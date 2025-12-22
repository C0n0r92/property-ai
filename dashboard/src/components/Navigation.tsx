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
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 via-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-cyan-500/25 group-hover:shadow-cyan-500/40 transition-shadow">
                IPD
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
                href="/insights"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 text-emerald-400 hover:from-emerald-500/20 hover:to-cyan-500/20 transition-colors font-medium flex items-center gap-2"
              >
                <span>Insights</span>
                <span className="text-[10px] bg-gradient-to-r from-amber-400 to-orange-500 text-black px-1.5 py-0.5 rounded-full font-bold">PRO</span>
              </Link>
              {user?.tier === 'premium' && (
                <Link
                  href="/saved"
                  className="px-4 py-2 rounded-lg text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors font-medium"
                >
                  Saved
                </Link>
              )}
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
