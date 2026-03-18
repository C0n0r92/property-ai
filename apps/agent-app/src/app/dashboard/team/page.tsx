'use client';

import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { LogOut, Users, UserPlus, Shield } from 'lucide-react';
import Link from 'next/link';

function TeamContent() {
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
                <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Team Management</p>
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
          <h2 className="text-3xl font-bold mb-2">Team Management</h2>
          <p style={{ color: 'var(--foreground-secondary)' }}>Manage team members and control access levels</p>
        </div>

        <div className="card mb-8" style={{ borderLeft: '4px solid var(--accent)' }}>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg" style={{ background: 'var(--accent-bg)' }}>
              <Users style={{ color: 'var(--accent)' }} size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">Coming Soon</h3>
              <p style={{ color: 'var(--foreground-secondary)', marginBottom: '1.5rem' }}>
                Manage team members and control access levels across your agency. Invite colleagues, set permissions, and track team usage.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="card-static">
                  <div className="flex items-center gap-2 mb-2">
                    <UserPlus size={18} style={{ color: 'var(--positive)' }} />
                    <span className="font-medium">Invite Members</span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                    Add team members with email invites
                  </p>
                </div>
                <div className="card-static">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={18} style={{ color: 'var(--accent)' }} />
                    <span className="font-medium">Role Permissions</span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                    Admin, agent, and viewer roles
                  </p>
                </div>
                <div className="card-static">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={18} style={{ color: 'var(--warning)' }} />
                    <span className="font-medium">Usage Tracking</span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                    Monitor team search activity
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
          <h4 className="font-semibold mb-4">Want Early Access?</h4>
          <p style={{ color: 'var(--foreground-secondary)', marginBottom: '1rem' }}>
            Sign up for our Team plan waitlist to be notified when this feature launches.
          </p>
          <button className="btn-secondary">
            Join Waitlist
          </button>
        </div>
      </main>
    </>
  );
}

export default function TeamPage() {
  return (
    <ProtectedRoute>
      <TeamContent />
    </ProtectedRoute>
  );
}
