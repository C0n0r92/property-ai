'use client';

import { useAuth } from './AuthProvider';
import { UserMenu } from './UserMenu';

export function AuthButtons() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="w-32 h-10 bg-[var(--muted)] animate-pulse rounded-lg" />
    );
  }

  if (user) {
    return <UserMenu />;
  }

  // Don't show anything in nav for non-authenticated users
  return null;
}

