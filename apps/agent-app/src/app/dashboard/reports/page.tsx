'use client';

import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { LogOut, FileText, BarChart3, Download, Mail } from 'lucide-react';
import Link from 'next/link';

function ReportsContent() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <>
      <nav className="sticky top-0 z-50 backdrop-blur" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition">
              <div className="w-10 h-10 rounded-lg text-white flex items-center justify-center font-bold" style={{ background: 'var(--gradient-primary)' }}>G</div>
              <div>
                <h1 className="text-lg font-bold">Gaff Intel</h1>
                <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Market Reports</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm transition"
              style={{ color: 'var(--foreground-secondary)' }}
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Market Reports</h2>
          <p style={{ color: 'var(--foreground-secondary)' }}>Generate branded reports for clients and vendors</p>
        </div>

        <div className="card mb-8" style={{ borderLeft: '4px solid var(--positive)' }}>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg" style={{ background: 'var(--positive-bg)' }}>
              <FileText style={{ color: 'var(--positive)' }} size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">Coming Soon</h3>
              <p style={{ color: 'var(--foreground-secondary)', marginBottom: '1.5rem' }}>
                Generate branded area reports with market analysis and client insights. Impress vendors with data-driven presentations.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="card-static">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 size={18} style={{ color: 'var(--accent)' }} />
                    <span className="font-medium">Area Analysis</span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                    Comprehensive market statistics by area
                  </p>
                </div>
                <div className="card-static">
                  <div className="flex items-center gap-2 mb-2">
                    <Download size={18} style={{ color: 'var(--positive)' }} />
                    <span className="font-medium">PDF Export</span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                    Professionally designed A4 reports
                  </p>
                </div>
                <div className="card-static">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail size={18} style={{ color: 'var(--warning)' }} />
                    <span className="font-medium">Email Delivery</span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                    Send reports directly to clients
                  </p>
                </div>
              </div>
              <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                Expected launch: April 2026
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <h4 className="font-semibold mb-4">Try Valuation Reports Now</h4>
          <p style={{ color: 'var(--foreground-secondary)', marginBottom: '1rem' }}>
            You can already download PDF valuation reports from our Property Valuation tool.
          </p>
          <button
            className="btn-primary"
            onClick={() => router.push('/dashboard/valuation')}
          >
            Go to Valuation Tool
          </button>
        </div>
      </main>
    </>
  );
}

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <ReportsContent />
    </ProtectedRoute>
  );
}
